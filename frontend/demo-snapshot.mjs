// Execute na raiz: node frontend/demo-snapshot.mjs. Somente templates e corpus públicos.
import { readFile, writeFile } from "node:fs/promises";
import { catalogoDePontos } from "../backend/src/llm/catalogo.ts";

const nomes = ["stf-tema-6", "stf-tema-1234", "stf-tema-500"];
const fontes = await Promise.all(nomes.map(async (nome, i) => {
  const texto = await readFile(new URL(`../backend/corpus/${nome}.md`, import.meta.url), "utf8");
  const [, meta, corpo] = texto.split("---");
  const campo = (chave) => meta.match(new RegExp(`^${chave}: (.+)$`, "m"))?.[1] ?? "";
  const secoes = corpo.trim().split(/^## /m).filter(Boolean);
  const secao = secoes[nome === "stf-tema-6" ? 1 : 0];
  const [ancora, ...linhas] = secao.split("\n");
  return { trecho_id: i + 1, documento: campo("titulo"), tipo: campo("tipo"), url_oficial: campo("url"), ancora, conteudo: linhas.join("\n").trim() };
}));
await writeFile(new URL("./src/demo/catalogo.json", import.meta.url), JSON.stringify({ pontos: catalogoDePontos(), fontes }, null, 2) + "\n");
