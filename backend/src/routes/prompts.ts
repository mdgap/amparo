import type { FastifyInstance } from "fastify";
import { catalogoDePontos } from "../llm/catalogo.ts";
import { temLLM } from "../env.ts";

export async function rotasDePrompts(app: FastifyInstance) {
  /**
   * Catálogo para a ajuda contextual. É leitura de código: não chama modelo,
   * não toca no caso e não depende de haver análise em andamento.
   */
  app.get("/prompts", async () => ({
    iaDisponivel: temLLM,
    pontos: catalogoDePontos(),
  }));
}
