import { z } from "zod";

/**
 * Uma única chave (OpenRouter) cobre redação, classificação e embeddings.
 * Sem ela o app sobe igual: o dossiê não é gerado e a busca cai para lexical.
 */
const schema = z.object({
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/mindthegap"),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  /** Serviço de anonimização, na própria infraestrutura. */
  ANONIMIZADOR_URL: z.string().default("http://anonimizador:8000"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  /** Modelo de redação e classificação. Nunca calcula número. */
  OPENROUTER_MODEL: z.string().default("openai/gpt-oss-120b"),
  /** Modelo de embeddings, ou "none" para forçar a busca lexical. */
  EMBEDDINGS_MODEL: z.string().default("voyageai/voyage-4-lite"),
  /** Precisa bater com VECTOR(n) da migração 001 — hoje 1024. */
  EMBEDDINGS_DIM: z.coerce.number().default(1024),
});

export const env = schema.parse(process.env);
export const temLLM = Boolean(env.OPENROUTER_API_KEY);
export const temEmbeddings = temLLM && env.EMBEDDINGS_MODEL !== "none";
