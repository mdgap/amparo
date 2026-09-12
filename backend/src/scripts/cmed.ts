/**
 * Carga da lista de preços da CMED na tabela `cmed_preco`.
 *
 *   npm run db:cmed                  # descobre e baixa o PMVG do portal
 *   npm run db:cmed -- arquivo.xlsx  # usa um arquivo local
 *   npm run db:cmed -- arquivo.csv   # idem, exportado para CSV
 *   npm run db:cmed -- https://...   # baixa de uma URL específica
 *
 * O portal da ANVISA publica PDF e XLSX — não há CSV oficial. O script lê os
 * dois formatos: XLSX direto do portal, CSV para quem já exportou.
 */
import { createWriteStream } from "node:fs";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { pool } from "../db.ts";
import { precoCmed, unidadesDaApresentacao, versaoDaTabela } from "../domain/cmed.ts";

const PORTAL = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos";

/** Colunas que interessam, por nome normalizado do cabeçalho da CMED. */
const COLUNAS = {
  principioAtivo: ["substancia"],
  produto: ["produto"],
  apresentacao: ["apresentacao"],
  laboratorio: ["laboratorio"],
  ean: ["ean 1", "ean1"],
  pmvgSemImpostos: ["pmvg sem impostos"],
  pmvg0: ["pmvg 0 %", "pmvg 0%"],
} as const;

type Campo = keyof typeof COLUNAS;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Acha o link do PMVG (xlsx) na página do portal. */
async function descobrirNoPortal(): Promise<string> {
  const html = await (await fetch(PORTAL)).text();
  const m = /href="([^"]*xls_conformidade_gov_[^"]*)"/i.exec(html);
  if (!m) {
    throw new Error(
      `não achei o link do PMVG em ${PORTAL}. Baixe a planilha "PMVG - xls" e rode: npm run db:cmed -- caminho/arquivo.xlsx`,
    );
  }
  return new URL(m[1]!, PORTAL).href;
}

async function baixar(url: string): Promise<string> {
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok || !resp.body) throw new Error(`download falhou: ${resp.status}`);
  const dir = await mkdtemp(join(tmpdir(), "cmed-"));
  const destino = join(dir, url.toLowerCase().includes(".csv") ? "cmed.csv" : "cmed.xlsx");
  await pipeline(Readable.fromWeb(resp.body as never), createWriteStream(destino));
  return destino;
}

interface Linha {
  celulas: string[];
}

/** Lê XLSX em streaming: a lista tem ~26 mil linhas e 74 colunas. */
async function* lerXlsx(caminho: string): AsyncGenerator<Linha> {
  const wb = new ExcelJS.stream.xlsx.WorkbookReader(caminho, {
    sharedStrings: "cache",
    worksheets: "emit",
    entries: "emit",
    styles: "ignore",
  });
  for await (const planilha of wb) {
    for await (const linha of planilha) {
      const valores = linha.values as unknown[];
      // `values` é 1-indexado no exceljs; o buraco do índice 0 sai fora.
      yield { celulas: valores.slice(1).map((v) => textoDaCelula(v)) };
    }
    break; // só a primeira aba
  }
}

function textoDaCelula(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "result" in v) {
    return String((v as { result: unknown }).result ?? "");
  }
  if (typeof v === "object" && v !== null && "text" in v) {
    return String((v as { text: unknown }).text ?? "");
  }
  return String(v);
}

/** CSV com separador ; (padrão pt-BR do Excel), com aspas. */
async function* lerCsv(caminho: string): AsyncGenerator<Linha> {
  const bruto = await readFile(caminho, "latin1");
  const texto = bruto.includes("�") ? await readFile(caminho, "utf8") : bruto;
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha.trim()) continue;
    const celulas: string[] = [];
    let atual = "";
    let dentroDeAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i]!;
      if (c === '"') {
        if (dentroDeAspas && linha[i + 1] === '"') { atual += '"'; i++; }
        else dentroDeAspas = !dentroDeAspas;
      } else if ((c === ";" || c === ",") && !dentroDeAspas) {
        celulas.push(atual); atual = "";
      } else atual += c;
    }
    celulas.push(atual);
    yield { celulas };
  }
}

const LOTE = 500;

async function carregar(caminho: string, versaoManual?: string) {
  const ler = caminho.endsWith(".csv") ? lerCsv : lerXlsx;

  let indices: Partial<Record<Campo, number>> | null = null;
  let versao = versaoManual ?? null;
  let lote: unknown[][] = [];
  let gravadas = 0;
  let semUnidades = 0;
  let semPreco = 0;

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    // A lista é substituída inteira: preço velho misturado com novo é pior
    // que tabela vazia — o número vai para uma peça processual.
    await cliente.query("TRUNCATE cmed_preco RESTART IDENTITY");

    const descarregar = async () => {
      if (!lote.length) return;
      const valores: unknown[] = [];
      const grupos = lote.map((linha, i) => {
        valores.push(...linha);
        const base = i * 8;
        // Cast explícito: em INSERT ... SELECT FROM (VALUES ...) o Postgres não
        // infere o tipo dos parâmetros e trataria tudo como text.
        return `($${base + 1}::text,$${base + 2}::text,$${base + 3}::text,$${base + 4}::text,$${base + 5}::text,$${base + 6}::numeric,$${base + 7}::numeric,$${base + 8}::int)`;
      });
      await cliente.query(
        `INSERT INTO cmed_preco
           (principio_ativo, produto, apresentacao, laboratorio, ean,
            pmvg_sem_impostos, pmvg_0, unidades_por_apresentacao, tabela_versao)
         SELECT v.*, $${lote.length * 8 + 1}::text FROM (VALUES ${grupos.join(",")}) AS v`,
        [...valores, versao],
      );
      gravadas += lote.length;
      lote = [];
      if (gravadas % 5000 === 0) console.log(`  ${gravadas} apresentações...`);
    };

    for await (const { celulas } of ler(caminho)) {
      if (!indices) {
        // O preâmbulo da planilha traz a data de publicação.
        if (!versao) versao = versaoDaTabela(celulas.join(" ")) ?? null;

        const normalizadas = celulas.map(normalizar);
        if (!normalizadas.includes("substancia")) continue;

        indices = {};
        for (const [campo, nomes] of Object.entries(COLUNAS) as [Campo, readonly string[]][]) {
          const i = normalizadas.findIndex((n) => nomes.includes(n));
          if (i >= 0) indices[campo] = i;
        }
        const faltando = (Object.keys(COLUNAS) as Campo[]).filter((c) => indices![c] === undefined);
        if (faltando.length) {
          throw new Error(
            `colunas não encontradas: ${faltando.join(", ")}.\n` +
              `Cabeçalho lido: ${normalizadas.filter(Boolean).slice(0, 20).join(" | ")}`,
          );
        }
        if (!versao) {
          throw new Error('não achei a data de publicação; passe --versao=AAAA-MM');
        }
        console.log(`Tabela CMED ${versao}`);
        continue;
      }

      const campo = (c: Campo) => (celulas[indices![c]!] ?? "").trim();
      const principioAtivo = campo("principioAtivo");
      const produto = campo("produto");
      const apresentacao = campo("apresentacao");
      if (!principioAtivo || !produto || !apresentacao) continue;

      const pmvg0 = precoCmed(campo("pmvg0"));
      const unidades = unidadesDaApresentacao(apresentacao);
      if (pmvg0 === null) semPreco++;
      if (unidades === null) semUnidades++;

      lote.push([
        principioAtivo, produto, apresentacao,
        campo("laboratorio") || null,
        campo("ean").replace(/\D/g, "") || null,
        precoCmed(campo("pmvgSemImpostos")),
        pmvg0,
        unidades,
      ]);
      if (lote.length >= LOTE) await descarregar();
    }

    if (!indices) throw new Error("não achei o cabeçalho (coluna SUBSTÂNCIA) no arquivo");
    await descarregar();
    await cliente.query("COMMIT");

    console.log(`\n✓ ${gravadas} apresentações da tabela ${versao}`);
    console.log(`  ${semPreco} sem PMVG 0% e ${semUnidades} sem unidades dedutíveis`);
    console.log("  (apresentação ambígua fica sem unidades de propósito: quem preenche é o advogado)");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
}

const args = process.argv.slice(2);
const versao = args.find((a) => a.startsWith("--versao="))?.split("=")[1];
const alvo = args.find((a) => !a.startsWith("--"));

const origem = alvo ?? (await descobrirNoPortal());
const caminho = /^https?:\/\//.test(origem) ? await baixar(origem) : origem;
if (!alvo) console.log(`Baixado do portal da CMED: ${origem.slice(0, 90)}...`);

await carregar(caminho, versao);
await pool.end();
