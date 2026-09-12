import { query, toVector } from "../db.ts";
import { embed } from "./embeddings.ts";

export interface TrechoEncontrado {
  trecho_id: number;
  conteudo: string;
  ancora: string | null;
  documento: string;
  tipo: string;
  url_oficial: string | null;
  score: number;
}

/**
 * Busca híbrida no corpus: vetorial (pgvector) quando há embeddings, com
 * fallback lexical por trigram. Sempre devolve o suficiente para citar a fonte.
 */
export async function buscarCorpus(
  pergunta: string,
  limite = 8,
): Promise<TrechoEncontrado[]> {
  const vetores = await embed([pergunta]).catch(() => null);

  if (vetores?.[0]) {
    return query<TrechoEncontrado>(
      `SELECT t.id AS trecho_id, t.conteudo, t.ancora,
              d.titulo AS documento, d.tipo, d.url_oficial,
              1 - (t.embedding <=> $1::vector) AS score
         FROM trecho t
         JOIN documento d ON d.id = t.documento_id
        WHERE t.embedding IS NOT NULL
        ORDER BY t.embedding <=> $1::vector
        LIMIT $2`,
      [toVector(vetores[0]), limite],
    );
  }

  return query<TrechoEncontrado>(
    `SELECT t.id AS trecho_id, t.conteudo, t.ancora,
            d.titulo AS documento, d.tipo, d.url_oficial,
            similarity(t.conteudo, $1) AS score
       FROM trecho t
       JOIN documento d ON d.id = t.documento_id
      WHERE t.conteudo % $1
      ORDER BY similarity(t.conteudo, $1) DESC
      LIMIT $2`,
    [pergunta, limite],
  );
}

/** Formata os trechos para irem no prompt com identificador citável. */
export function montarContexto(trechos: TrechoEncontrado[]): string {
  return trechos
    .map(
      (t, i) =>
        `[F${i + 1}] ${t.documento}${t.ancora ? ` — ${t.ancora}` : ""}\n${t.conteudo}`,
    )
    .join("\n\n---\n\n");
}
