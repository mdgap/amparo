import pg from "pg";
import { env } from "./env.ts";

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const r = await pool.query<T>(text, params);
  return r.rows;
}

/** pgvector aceita o literal '[1,2,3]'. */
export function toVector(valores: number[]): string {
  return `[${valores.join(",")}]`;
}
