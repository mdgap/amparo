import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { Repositorio } from "../app.ts";
import { calcularMetricas, resumirParaHistorico } from "../domain/historico.ts";

const listaSchema = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(20),
  antesDe: z.coerce.number().int().positive().optional(),
});

export interface OpcoesHistorico {
  repositorio: Repositorio;
}

/** Histórico e métricas para o dashboard. Sem banco, respondem 503 — o motor segue no ar. */
export async function rotasDeHistorico(app: FastifyInstance, { repositorio }: OpcoesHistorico) {
  const indisponivel = (reply: FastifyReply, e: unknown) => {
    app.log.warn({ tipo: e instanceof Error ? e.name : typeof e }, "banco indisponível para o histórico");
    return reply.code(503).send({ erro: "Histórico indisponível: o banco de dados não respondeu." });
  };

  app.get("/analises", async (req, reply) => {
    const parsed = listaSchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "Parâmetros inválidos: limite de 1 a 100 e antesDe inteiro positivo." });
    }
    const { limite, antesDe } = parsed.data;

    try {
      // Pede um a mais para saber se existe próxima página sem outra consulta.
      const linhas = await repositorio.listarAnalises({ limite: limite + 1, antesDe });
      const itens = linhas.slice(0, limite).map(resumirParaHistorico);
      return { itens, proximo: linhas.length > limite ? itens[itens.length - 1]!.id : null };
    } catch (e) {
      return indisponivel(reply, e);
    }
  });

  app.get("/metricas", async (_req, reply) => {
    try {
      return calcularMetricas(await repositorio.linhasParaMetricas());
    } catch (e) {
      return indisponivel(reply, e);
    }
  });
}
