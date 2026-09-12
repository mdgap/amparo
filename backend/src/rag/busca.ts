import { query, toVector } from "../db.ts";
import { embed } from "./embeddings.ts";

/**
 * Piso de `word_similarity` no fallback lexical. Medido contra o corpus atual:
 * perguntas legítimas que erravam ficavam em 0,43–0,50 e ruído puro ("receita
 * de bolo de cenoura") em 0,25. O padrão do operador `<%` é 0,6 — estrito
 * demais para pergunta longa. Filtro explícito em vez de `<%` porque o limiar
 * do operador é ajuste de sessão, e o pool não garante a mesma conexão.
 */
const LIMIAR_LEXICAL = 0.4;

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
 *
 * O fallback usa `word_similarity` (operador `<%`), não `similarity`: o trecho
 * do corpus é muito maior que a pergunta, e comparar os dois inteiros dilui o
 * score abaixo do limiar — "medicamento sem registro na ANVISA" não achava nada.
 * `word_similarity` compara a pergunta com a melhor janela dentro do trecho.
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
            word_similarity($1, t.conteudo) AS score
       FROM trecho t
       JOIN documento d ON d.id = t.documento_id
      WHERE word_similarity($1, t.conteudo) >= $3
      ORDER BY word_similarity($1, t.conteudo) DESC
      LIMIT $2`,
    [pergunta, limite, LIMIAR_LEXICAL],
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
