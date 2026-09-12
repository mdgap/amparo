import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buscarNotas } from "../natjus/busca.ts";

const schema = z.object({
  q: z.string().min(3),
  cid: z.string().optional(),
  conclusao: z.enum(["favoravel", "nao_favoravel"]).optional(),
  pagina: z.coerce.number().int().min(1).max(50).optional(),
});

export async function rotasNatJus(app: FastifyInstance) {
  /**
   * Notas técnicas do e-NatJus para um princípio ativo. Consulta pública do
   * CNJ, sem autenticação — devolvemos a lista e o link, e quem escolhe a nota
   * do caso é o advogado.
   */
  app.get("/natjus", async (req, reply) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "informe ao menos 3 caracteres em q" });
    }

    try {
      return await buscarNotas({ principioAtivo: parsed.data.q, ...parsed.data });
    } catch (e) {
      req.log.warn({ e }, "consulta ao e-NatJus falhou");
      // Degrada: sem nota, o produto segue como antes de existir esta busca.
      return reply.code(502).send({
        erro:
          "Não consegui consultar o e-NatJus agora. A consulta pública do CNJ pode estar fora do ar — " +
          "cole a nota manualmente se já tiver.",
      });
    }
  });
}
