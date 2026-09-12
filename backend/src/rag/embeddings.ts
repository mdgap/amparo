import { env } from "../env.ts";

/**
 * Embeddings para busca no corpus. Provider "none" desliga a busca vetorial e
 * o RAG cai para busca lexical (trigram) — o app roda sem nenhuma chave.
 */
export async function embed(textos: string[]): Promise<number[][] | null> {
  if (env.EMBEDDINGS_PROVIDER === "none" || !env.VOYAGE_API_KEY) return null;

  const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.VOYAGE_MODEL,
      input: textos,
      output_dimension: env.EMBEDDINGS_DIM,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Voyage ${resp.status}: ${await resp.text()}`);
  }
  const json = (await resp.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}
