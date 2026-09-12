/**
 * Ingestão do corpus normativo: lê backend/corpus/*.md, quebra em trechos
 * citáveis, gera embeddings (se houver chave) e grava no Postgres.
 *
 * Frontmatter esperado:
 *   ---
 *   slug: tema-1234-stf
 *   titulo: Tema 1234 do STF
 *   tipo: tema_stf
 *   orgao: STF
 *   url: https://...
 *   publicado_em: 2024-09-18
 *   ---
 *
 * Cada bloco separado por linha em branco vira um trecho. Um cabeçalho markdown
 * (`## art. 19-Q`) vira a âncora dos trechos seguintes, que é o que aparece na
 * citação do dossiê.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, toVector } from "../db.ts";
import { embed } from "../rag/embeddings.ts";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../corpus");

interface Bloco {
  ancora: string | null;
  conteudo: string;
}

function parseFrontmatter(texto: string) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(texto);
  if (!m) throw new Error("arquivo sem frontmatter");
  const meta: Record<string, string> = {};
  for (const linha of m[1]!.split("\n")) {
    const i = linha.indexOf(":");
    if (i > 0) meta[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  return { meta, corpo: texto.slice(m[0].length) };
}

function emBlocos(corpo: string): Bloco[] {
  const blocos: Bloco[] = [];
  let ancora: string | null = null;
  for (const bruto of corpo.split(/\n{2,}/)) {
    const bloco = bruto.trim();
    if (!bloco) continue;
    const titulo = /^#{1,6}\s+(.*)$/.exec(bloco);
    if (titulo) {
      ancora = titulo[1]!.trim();
      continue;
    }
    blocos.push({ ancora, conteudo: bloco });
  }
  return blocos;
}

const arquivos = (await readdir(dir)).filter((f) => f.endsWith(".md") && f !== "README.md");
if (arquivos.length === 0) {
  console.log(`Nenhum .md em ${dir}. Adicione o corpus e rode de novo.`);
  await pool.end();
  process.exit(0);
}

let totalTrechos = 0;
for (const arquivo of arquivos) {
  const { meta, corpo } = parseFrontmatter(await readFile(join(dir, arquivo), "utf8"));
  const blocos = emBlocos(corpo);

  const [doc] = (
    await pool.query<{ id: number }>(
      `INSERT INTO documento (slug, titulo, tipo, orgao, url_oficial, publicado_em)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (slug) DO UPDATE
         SET titulo = EXCLUDED.titulo, tipo = EXCLUDED.tipo,
             orgao = EXCLUDED.orgao, url_oficial = EXCLUDED.url_oficial
       RETURNING id`,
      [meta.slug, meta.titulo, meta.tipo, meta.orgao ?? null,
       meta.url ?? null, meta.publicado_em || null],
    )
  ).rows;

  await pool.query("DELETE FROM trecho WHERE documento_id = $1", [doc!.id]);

  const vetores = await embed(blocos.map((b) => b.conteudo)).catch((e) => {
    console.warn(`  aviso: embeddings indisponíveis (${e.message}); segue lexical`);
    return null;
  });

  for (const [i, bloco] of blocos.entries()) {
    await pool.query(
      `INSERT INTO trecho (documento_id, ordem, ancora, conteudo, embedding)
       VALUES ($1,$2,$3,$4,$5)`,
      [doc!.id, i, bloco.ancora, bloco.conteudo,
       vetores?.[i] ? toVector(vetores[i]!) : null],
    );
  }
  totalTrechos += blocos.length;
  console.log(`✓ ${meta.slug}: ${blocos.length} trechos${vetores ? " (com embeddings)" : ""}`);
}

await pool.end();
console.log(`\n${arquivos.length} documento(s), ${totalTrechos} trecho(s).`);
