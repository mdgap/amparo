import { env, temEmbeddings } from "../env.ts";

/**
 * Embeddings pela OpenRouter, com a mesma chave da redação.
 *
 * Sem ZDR de propósito: por aqui passa só o corpus normativo, que é público, e
 * a pergunta de busca, que é o nome do medicamento. Nenhum documento do caso.
 * Além disso, os modelos de embedding da OpenRouter hoje não têm endpoint ZDR
 * — exigir travaria a ingestão.
 * `EMBEDDINGS_MODEL=none` (ou chave ausente) desliga a busca vetorial e o RAG
 * cai para busca lexical — o app roda sem nenhuma chave.
 */
export async function embed(textos: string[]): Promise<number[][] | null> {
  if (!temEmbeddings) return null;

  const resp = await fetch(`${env.OPENROUTER_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "X-Title": "MindTheGap",
    },
    body: JSON.stringify({
      model: env.EMBEDDINGS_MODEL,
      input: textos,
      encoding_format: "float",
      // Matryoshka: pede o tamanho que a coluna VECTOR(n) espera.
      dimensions: env.EMBEDDINGS_DIM,
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenRouter embeddings ${resp.status}: ${await resp.text()}`);
  }

  const json = (await resp.json()) as {
    data?: { index?: number; embedding: number[] }[];
    error?: { message?: string };
  };
  if (json.error) throw new Error(`OpenRouter embeddings: ${json.error.message}`);
  if (!json.data?.length) throw new Error("OpenRouter embeddings: resposta sem vetores");

  // A ordem da resposta não é garantida; `index` é.
  const vetores = [...json.data]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((d) => d.embedding);

  const dim = vetores[0]!.length;
  if (dim !== env.EMBEDDINGS_DIM) {
    throw new Error(
      `${env.EMBEDDINGS_MODEL} devolveu ${dim} dimensões, mas EMBEDDINGS_DIM=${env.EMBEDDINGS_DIM} ` +
        `e a coluna é VECTOR(${env.EMBEDDINGS_DIM}). Escolha um modelo que aceite esse tamanho ` +
        `ou altere a coluna em db/migrations e reingira o corpus.`,
    );
  }

  return vetores;
}
