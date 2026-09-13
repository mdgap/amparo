import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env, temLLM } from "./env.ts";
import { rotasDeAnalise } from "./routes/analise.ts";
import { rotasDeHistorico } from "./routes/historico.ts";
import { rotasCmed } from "./routes/cmed.ts";
import { rotasDeDocumento } from "./routes/documento.ts";
import { rotasNatJus } from "./routes/natjus.ts";
import { rotasDePrompts } from "./routes/prompts.ts";
import { analisarTema6 } from "./llm/analisarTema6.ts";
import { redigirDossie } from "./llm/redigirDossie.ts";
import { anonimizarVarios } from "./documentos/anonimizar.ts";
import { repositorioPostgres } from "./repositorio.ts";
import { protegerErros } from "./erros.ts";
import type { LinhaAnalise, RegistroAnalise } from "./domain/historico.ts";

export interface Repositorio {
  gravarAnalise(registro: RegistroAnalise): Promise<void>;
  listarAnalises(filtro: { limite: number; antesDe?: number }): Promise<LinhaAnalise[]>;
  linhasParaMetricas(): Promise<LinhaAnalise[]>;
  buscarAnalise(id: number): Promise<LinhaAnalise | null>;
}

export interface IA {
  temLLM: boolean;
  analisarTema6: typeof analisarTema6;
  redigirDossie: typeof redigirDossie;
}

export interface Dependencias {
  repositorio: Repositorio;
  ia: IA;
  /** Serviço de anonimização — nos testes, um substituto sem rede. */
  anonimizar: typeof anonimizarVarios;
  /** Destino do log; os testes capturam para conferir que nada vaza. */
  logStream?: { write(linha: string): void };
}

/** Monta a API sem abrir porta — o `server.ts` escuta, os testes usam `inject`. */
export async function construirApp(deps: Partial<Dependencias> = {}): Promise<FastifyInstance> {
  const repositorio = deps.repositorio ?? repositorioPostgres;
  const ia = deps.ia ?? { temLLM, analisarTema6, redigirDossie };
  const anonimizar = deps.anonimizar ?? anonimizarVarios;

  const app = Fastify({ logger: deps.logStream ? { stream: deps.logStream } : true });

  // Antes das rotas: os plugins herdam o tratador de erros do app raiz.
  protegerErros(app);

  await app.register(cors, { origin: env.CORS_ORIGIN.split(",") });
  await app.register(multipart);
  await app.register(rotasDeAnalise, { prefix: "/api", repositorio, ia, anonimizar });
  await app.register(rotasDeHistorico, { prefix: "/api", repositorio });
  await app.register(rotasCmed, { prefix: "/api" });
  await app.register(rotasDeDocumento, { prefix: "/api" });
  await app.register(rotasNatJus, { prefix: "/api" });
  await app.register(rotasDePrompts, { prefix: "/api" });

  /**
   * Rota inexistente também responde no formato que a interface lê. Sem isso, um
   * 404 — servidor desatualizado, rota ainda não registrada — chegava na tela
   * como a mensagem genérica de falha, escondendo a causa.
   */
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ erro: `Rota não encontrada: ${req.method} ${req.url}` });
  });

  app.get("/health", async () => ({ ok: true }));

  return app;
}
