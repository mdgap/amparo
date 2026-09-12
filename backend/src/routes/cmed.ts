import type { FastifyInstance } from "fastify";
import { query } from "../db.ts";

/** Busca de apresentação na tabela CMED — origem do preço usado no cálculo. */
export async function rotasCmed(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string } }>("/cmed", async (req, reply) => {
    const q = (req.query.q ?? "").trim();
    if (q.length < 3) return reply.code(400).send({ erro: "informe ao menos 3 caracteres" });

    return query(
      `SELECT id, principio_ativo, produto, apresentacao, laboratorio,
              pmvg_0, unidades_por_apresentacao, tabela_versao
         FROM cmed_preco
        WHERE produto % $1 OR principio_ativo % $1
        ORDER BY GREATEST(similarity(produto, $1), similarity(principio_ativo, $1)) DESC
        LIMIT 20`,
      [q],
    );
  });
}
