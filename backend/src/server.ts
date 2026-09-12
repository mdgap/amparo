import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.ts";
import { rotasDeAnalise } from "./routes/analise.ts";
import { rotasCmed } from "./routes/cmed.ts";

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.CORS_ORIGIN.split(",") });
await app.register(rotasDeAnalise, { prefix: "/api" });
await app.register(rotasCmed, { prefix: "/api" });

/**
 * Falha inesperada vira mensagem em português no campo `erro`, que é o que a
 * interface sabe ler. Sem isso, um 500 depois de dois minutos de modelo
 * chegava na tela como "Falha na requisição", sem dizer nada a ninguém.
 */
app.setErrorHandler((erro: Error & { statusCode?: number }, req, reply) => {
  req.log.error({ erro }, "falha não tratada");
  reply.code(erro.statusCode && erro.statusCode < 500 ? erro.statusCode : 500).send({
    erro:
      erro.statusCode && erro.statusCode < 500
        ? erro.message
        : `Falha ao processar a análise: ${erro.message}`,
  });
});

app.get("/health", async () => ({ ok: true }));

await app.listen({ port: env.PORT, host: "0.0.0.0" });
