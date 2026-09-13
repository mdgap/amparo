/**
 * Carga do painel de tecnologias demandadas à CONITEC.
 *
 *   npm run db:conitec                  # descobre e baixa do portal
 *   npm run db:conitec -- arquivo.xlsx  # usa um arquivo local
 *   npm run db:conitec -- --se-necessario
 *
 * É a fonte do requisito (b) do Tema 6. O portal publica os dados do painel
 * num .xlsx pequeno, com nome de tecnologia, data de protocolo, status e data
 * de decisão — que é exatamente o que a apuração da mora precisa.
 *
 * Mesmas cautelas da carga da CMED: trava contra carga concorrente, DELETE
 * dentro da transação em vez de TRUNCATE, e modo condicional para o start.
 */
import { createWriteStream } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { pool } from "../db.ts";

const PAGINA =
  "https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/tecnologias-demandadas";
/** A cada publicação o nome do arquivo muda de data; por isso é descoberto. */
const PADRAO_DO_ARQUIVO = /https:\/\/www\.gov\.br\/conitec\/[^"'\s]*Painel_Demandas_Conitec_(\d{8})\.xlsx/i;

const VALIDADE_EM_DIAS = 30;
const LOTE = 300;

/**
 * O portal serve o conteúdo como string JSON dentro do HTML: as barras e os
 * sinais de menor vêm escapados (`\u002F`, `\u003C`). Sem desfazer isso,
 * nenhum href é encontrado.
 */
function semEscapes(texto: string): string {
  return texto
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/\\"/g, '"')
    .replace(/\\\//g, "/");
}

async function descobrirNoPortal(): Promise<{ url: string; versao: string }> {
  const html = semEscapes(await (await fetch(PAGINA)).text());

  // O portal não linka o arquivo direto: a página aponta para um `resolveuid`,
  // e é essa segunda página que traz o nome real, com a data da publicação.
  const direto = PADRAO_DO_ARQUIVO.exec(html);
  if (direto) return montar(direto);

  for (const m of html.matchAll(/href="([^"]*resolveuid\/[^"]+)"/gi)) {
    const intermediaria = new URL(m[1]!, PAGINA).href;
    const pagina = semEscapes(
      await fetch(intermediaria).then((r) => r.text()).catch(() => ""),
    );
    const achado = PADRAO_DO_ARQUIVO.exec(pagina);
    if (achado) return montar(achado);
  }

  throw new Error(
    `não achei o arquivo do painel em ${PAGINA}. Baixe o .xlsx e rode: npm run db:conitec -- caminho/arquivo.xlsx`,
  );
}

function montar(m: RegExpExecArray): { url: string; versao: string } {
  const d = m[1]!;
  return {
    url: `${m[0]}/@@download/file`,
    versao: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
  };
}

async function baixar(url: string): Promise<string> {
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok || !resp.body) throw new Error(`download falhou: ${resp.status}`);
  const destino = join(await mkdtemp(join(tmpdir(), "conitec-")), "painel.xlsx");
  await pipeline(Readable.fromWeb(resp.body as never), createWriteStream(destino));
  return destino;
}

/** Data vinda do Excel: pode chegar como Date ou como texto. */
function data(valor: unknown): string | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor === "string") {
    const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(valor.trim());
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    const iso = /^\d{4}-\d{2}-\d{2}/.exec(valor.trim());
    if (iso) return iso[0];
  }
  return null;
}

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

async function carregar(caminho: string, versao: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(caminho);
  const planilha = wb.worksheets[0];
  if (!planilha) throw new Error("planilha vazia");

  const cliente = await pool.connect();
  let gravadas = 0;
  try {
    const [trava] = (
      await cliente.query<{ obtida: boolean }>(
        "SELECT pg_try_advisory_lock(hashtext('conitec_demanda')) AS obtida",
      )
    ).rows;
    if (!trava?.obtida) {
      console.log("Outra carga do painel da CONITEC está em andamento. Nada a fazer.");
      return;
    }

    await cliente.query("BEGIN");
    await cliente.query("DELETE FROM conitec_demanda");

    // Junta tudo primeiro e grava em lotes: escrever durante o eachRow
    // misturava o cursor da planilha com o do banco.
    const linhas: unknown[][] = [];
    planilha.eachRow((linha, n) => {
      if (n === 1) return; // cabeçalho
      const c = (col: number) => linha.getCell(col).value;
      const tecnologia = texto(c(6));
      const status = texto(c(7));
      if (!tecnologia || !status) return;
      linhas.push([
        tecnologia, texto(c(3)), texto(c(8)), texto(c(5)), texto(c(4)),
        status, data(c(2)), data(c(10)),
      ]);
    });

    for (let i = 0; i < linhas.length; i += LOTE) {
      const lote = linhas.slice(i, i + LOTE);
      const valores: unknown[] = [];
      const grupos = lote.map((linha, k) => {
        valores.push(...linha);
        const b = k * 8;
        return `($${b + 1}::text,$${b + 2}::text,$${b + 3}::text,$${b + 4}::text,$${b + 5}::text,$${b + 6}::text,$${b + 7}::date,$${b + 8}::date)`;
      });
      await cliente.query(
        `INSERT INTO conitec_demanda
           (tecnologia, tipo, indicacao, demandante, tema, status, data_protocolo, data_decisao, tabela_versao)
         SELECT v.*, $${lote.length * 8 + 1}::text FROM (VALUES ${grupos.join(",")}) AS v`,
        [...valores, versao],
      );
      gravadas += lote.length;
    }

    await cliente.query("COMMIT");
    console.log(`✓ ${gravadas} tecnologias demandadas, painel de ${versao}`);
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    await cliente.query("SELECT pg_advisory_unlock(hashtext('conitec_demanda'))").catch(() => {});
    cliente.release();
  }
}

const args = process.argv.slice(2);
const alvo = args.find((a) => !a.startsWith("--"));

if (args.includes("--se-necessario")) {
  const [linha] = (
    await pool.query<{ itens: string; idade: number | null }>(
      `SELECT count(*) AS itens,
              EXTRACT(EPOCH FROM (now() - max(criado_em))) / 86400 AS idade
         FROM conitec_demanda`,
    )
  ).rows;
  const itens = Number(linha?.itens ?? 0);
  const idade = linha?.idade === null ? null : Number(linha?.idade);
  if (itens > 0 && idade !== null && idade < VALIDADE_EM_DIAS) {
    console.log(`Painel da CONITEC já tem ${itens} tecnologias, há ${idade.toFixed(1)} dia(s). Nada a fazer.`);
    await pool.end();
    process.exit(0);
  }
}

const { url, versao } = alvo
  ? { url: "", versao: new Date().toISOString().slice(0, 10) }
  : await descobrirNoPortal();
const caminho = alvo ?? (await baixar(url));
if (!alvo) console.log(`Painel da CONITEC de ${versao}`);

await carregar(caminho, versao);
await pool.end();
