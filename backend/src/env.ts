import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/mindthegap"),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  EMBEDDINGS_PROVIDER: z.enum(["voyage", "none"]).default("none"),
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MODEL: z.string().default("voyage-3"),
  EMBEDDINGS_DIM: z.coerce.number().default(1024),
});

export const env = schema.parse(process.env);
export const temLLM = Boolean(env.ANTHROPIC_API_KEY);
