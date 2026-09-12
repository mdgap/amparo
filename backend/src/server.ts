import { env } from "./env.ts";
import { construirApp } from "./app.ts";

const app = await construirApp();

await app.listen({ port: env.PORT, host: "0.0.0.0" });
