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

const porVetor = (vetor: number[], limite: number) =>
  query<TrechoEncontrado>(
    `SELECT t.id AS trecho_id, t.conteudo, t.ancora,
            d.titulo AS documento, d.tipo, d.url_oficial,
            1 - (t.embedding <=> $1::vector) AS score
       FROM trecho t
       JOIN documento d ON d.id = t.documento_id
      WHERE t.embedding IS NOT NULL
      ORDER BY t.embedding <=> $1::vector
      LIMIT $2`,
    [toVector(vetor), limite],
  );

/**
 * O fallback usa `word_similarity` (operador `<%`), não `similarity`: o trecho
 * do corpus é muito maior que a pergunta, e comparar os dois inteiros dilui o
 * score abaixo do limiar — "medicamento sem registro na ANVISA" não achava nada.
 * `word_similarity` compara a pergunta com a melhor janela dentro do trecho.
 */
const porPalavra = (pergunta: string, limite: number) =>
  query<TrechoEncontrado>(
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

/**
 * Busca híbrida no corpus: vetorial (pgvector) quando há embeddings, com
 * fallback lexical por trigram. Sempre devolve o suficiente para citar a fonte.
 */
export async function buscarCorpus(
  pergunta: string,
  limite = 8,
): Promise<TrechoEncontrado[]> {
  const [trechos] = await buscarVarias([pergunta], limite);
  return trechos ?? [];
}

/** As listas de cada pergunta, na mesma ordem. Embeddings numa chamada só. */
async function buscarVarias(
  perguntas: string[],
  porConsulta: number,
): Promise<TrechoEncontrado[][]> {
  const vetores = await embed(perguntas).catch(() => null);

  return Promise.all(
    perguntas.map((pergunta, i) => {
      const vetor = vetores?.[i];
      const busca = vetor
        ? porVetor(vetor, porConsulta)
        : porPalavra(pergunta, porConsulta);
      // Uma pergunta que falha não derruba as outras: o contexto fica menor,
      // e prompt com menos fonte é pior que o ideal, não é erro.
      return busca.catch(() => [] as TrechoEncontrado[]);
    }),
  );
}

/**
 * Uma busca por pergunta, com os resultados intercalados.
 *
 * Uma consulta genérica para seis requisitos deixava requisito sem trecho que
 * o sustentasse — e a regra "cite [F1], [F2]" vale o que valem os trechos
 * recuperados. Aqui cada requisito faz a própria pergunta.
 *
 * A intercalação é o que garante cobertura: leva o melhor trecho de cada
 * pergunta antes do segundo melhor de qualquer uma. Ordenar tudo por score
 * global deixaria a pergunta mais "fácil" ocupar o contexto inteiro.
 */
export async function buscarCorpusVarias(
  perguntas: string[],
  limite = 8,
  porPergunta = 3,
): Promise<TrechoEncontrado[]> {
  return intercalar(await buscarVarias(perguntas, porPergunta), limite);
}

/**
 * Rodízio entre as listas, sem repetir trecho. Separado para poder testar.
 *
 * Cada pergunta tem um cursor próprio, e o cursor anda até o primeiro trecho
 * que ainda não entrou: trecho que já veio de outra pergunta não pode custar a
 * vez desta. Com posição fixa, a pergunta cujo melhor trecho fosse repetido
 * ficaria de fora da primeira rodada — e sem nada, se o limite fechasse ali.
 */
export function intercalar(
  listas: TrechoEncontrado[][],
  limite: number,
): TrechoEncontrado[] {
  const cursores = new Array<number>(listas.length).fill(0);
  const vistos = new Set<number>();
  const saida: TrechoEncontrado[] = [];

  let rendeu = true;
  while (rendeu && saida.length < limite) {
    rendeu = false;
    for (const [i, lista] of listas.entries()) {
      let c = cursores[i] ?? 0;
      while (c < lista.length && vistos.has(lista[c]!.trecho_id)) c++;
      cursores[i] = c + 1;

      const t = lista[c];
      if (!t) continue;
      vistos.add(t.trecho_id);
      saida.push(t);
      rendeu = true;
      if (saida.length >= limite) break;
    }
  }
  return saida;
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
