/**
 * Grava os quatro casos de demonstração no histórico, para o painel não abrir
 * vazio numa apresentação.
 *
 * Manual, nunca no deploy: `npm run db:demo`. Idempotente — se já houver caso
 * de demonstração no banco, não grava de novo.
 */
import { pool, query } from "../db.ts";
import { casosDeDemonstracao, PREFIXO_DEMONSTRACAO } from "../domain/demonstracao.ts";
import { repositorioPostgres } from "../repositorio.ts";

const existentes = await query<{ total: string }>(
  "SELECT count(*) AS total FROM analise WHERE entrada->'medicamento'->>'nome' LIKE $1",
  [`${PREFIXO_DEMONSTRACAO}%`],
);
const total = Number(existentes[0]?.total ?? 0);

if (total > 0) {
  console.log(`Já existem ${total} caso(s) de demonstração no histórico. Nada a fazer.`);
} else {
  const casos = casosDeDemonstracao();
  for (const registro of casos) await repositorioPostgres.gravarAnalise(registro);
  console.log(`✓ ${casos.length} casos de demonstração gravados no histórico.`);
}

await pool.end();
