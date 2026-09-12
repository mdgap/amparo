import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env, temLLM } from "./env.ts";
import { rotasDeAnalise } from "./routes/analise.ts";
import { rotasDeHistorico } from "./routes/historico.ts";
import { rotasCmed } from "./routes/cmed.ts";
import { rotasDeDocumento } from "./routes/documento.ts";
import { analisarTema6 } from "./llm/analisarTema6.ts";
import { redigirDossie } from "./llm/redigirDossie.ts";
import { repositorioPostgres } from "./repositorio.ts";
import { protegerErros } from "./erros.ts";
import type { LinhaAnalise, RegistroAnalise } from "./domain/historico.ts";

export interface Repositorio {
  gravarAnalise(registro: RegistroAnalise): Promise<void>;
  listarAnalises(filtro: { limite: number; antesDe?: number }): Promise<LinhaAnalise[]>;
  linhasParaMetricas(): Promise<LinhaAnalise[]>;
}

export interface IA {
  temLLM: boolean;
  analisarTema6: typeof analisarTema6;
  redigirDossie: typeof redigirDossie;
}

export interface Dependencias {
  repositorio: Repositorio;
  ia: IA;
  /** Destino do log; os testes capturam para conferir que nada vaza. */
  logStream?: { write(linha: string): void };
}

/** Monta a API sem abrir porta — o `server.ts` escuta, os testes usam `inject`. */
export async function construirApp(deps: Partial<Dependencias> = {}): Promise<FastifyInstance> {
  const repositorio = deps.repositorio ?? repositorioPostgres;
  const ia = deps.ia ?? { temLLM, analisarTema6, redigirDossie };

  const app = Fastify({ logger: deps.logStream ? { stream: deps.logStream } : true });

  // Antes das rotas: os plugins herdam o tratador de erros do app raiz.
  protegerErros(app);

  await app.register(cors, { origin: env.CORS_ORIGIN.split(",") });
  await app.register(multipart);
  await app.register(rotasDeAnalise, { prefix: "/api", repositorio, ia });
  await app.register(rotasDeHistorico, { prefix: "/api", repositorio });
  await app.register(rotasCmed, { prefix: "/api" });
  await app.register(rotasDeDocumento, { prefix: "/api" });

  app.get("/health", async () => ({ ok: true }));

  return app;
}
