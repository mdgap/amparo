import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.ts";
import { rotasDeAnalise } from "./routes/analise.ts";
import { rotasCmed } from "./routes/cmed.ts";

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.CORS_ORIGIN.split(",") });
await app.register(rotasDeAnalise, { prefix: "/api" });
await app.register(rotasCmed, { prefix: "/api" });

app.get("/health", async () => ({ ok: true }));

await app.listen({ port: env.PORT, host: "0.0.0.0" });
