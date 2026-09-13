import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { definirRota } from "../domain/rota.ts";
import { resumirTema6, REQUISITOS_TEMA_6 } from "../domain/tema6.ts";
import { PARAMETROS } from "../domain/parametros.ts";
import { analisarTema6 } from "../llm/analisarTema6.ts";
import { redigirDossie } from "../llm/redigirDossie.ts";
import { PROMPT_VERSAO } from "../llm/prompts/sistema.ts";
import { query } from "../db.ts";
import { env, temLLM } from "../env.ts";
import { anonimizarVarios } from "../documentos/anonimizar.ts";

const medicamentoSchema = z.object({
  nome: z.string().min(1),
  principioAtivo: z.string().optional(),
  apresentacao: z.string().optional(),
  precoApresentacao: z.number().nonnegative(),
  precoOrigem: z.enum(["cmed", "orcamento"]).default("cmed"),
  unidadesPorApresentacao: z.number().int().positive(),
  registroAnvisa: z.object({ possui: z.boolean(), numero: z.string().optional() }).optional(),
  incorporadoSus: z.boolean().optional(),
});

const posologiaSchema = z.object({
  unidadesPorTomada: z.number().positive(),
  tomadasPorDia: z.number().positive(),
  diasPorAno: z.number().int().min(1).max(366),
});

const analiseSchema = z.object({
  medicamento: medicamentoSchema,
  posologia: posologiaSchema,
  documentos: z
    .object({
      laudo: z.string().default(""),
      receita: z.string().optional(),
      notaENatJus: z.string().optional(),
      requerimentoAdministrativo: z.string().optional(),
    })
    .default({ laudo: "" }),
  /** Pula a redação do dossiê (mais rápido para conferir só a rota). */
  apenasRota: z.boolean().default(false),
});

const PII = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;

const ERRO_CPF =
  "CPF detectado nos documentos. Remova dados pessoais antes de enviar — a ferramenta trabalha sem identificação do paciente.";
const AVISO_SEM_IA = "OPENROUTER_API_KEY ausente: só o motor de regras foi executado.";

/** Passos que a interface acompanha, na ordem em que acontecem. */
export type PassoId = "anonimizacao" | "motor" | "tema6" | "placar" | "dossie";
export interface Passo {
  id: PassoId;
  estado: "fazendo" | "feito";
  detalhe?: string;
}

export async function rotasDeAnalise(app: FastifyInstance) {
  app.get("/requisitos", async () => ({
    requisitos: REQUISITOS_TEMA_6,
    parametros: PARAMETROS,
    iaDisponivel: temLLM,
  }));

  // Só o motor determinístico: responde sem chave de API e sem rede.
  app.post("/rota", async (req, reply) => {
    const parsed = analiseSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: parsed.error.issues });
    const { medicamento, posologia } = parsed.data;
    return { rota: definirRota(medicamento, posologia), parametrosVersao: PARAMETROS.versao };
  });

  /**
   * A análise, passo a passo, avisando o que está fazendo.
   *
   * São quase dois minutos de espera, quase todos dentro de duas chamadas ao
   * modelo. Sem dizer em que ponto está, a tela parece travada — e o usuário
   * não tem como saber que a anonimização aconteceu.
   */
  async function executarAnalise(
    dados: z.infer<typeof analiseSchema>,
    aviso: (passo: Passo) => void,
  ) {
    const { medicamento, posologia, documentos } = dados;

    aviso({ id: "anonimizacao", estado: "fazendo" });
    const ordem = ["laudo", "receita", "notaENatJus", "requerimentoAdministrativo"] as const;
    const limpos = await anonimizarVarios(ordem.map((c) => documentos[c] ?? ""));
    const anonimizados = Object.fromEntries(
      ordem.map((campo, i) => [campo, limpos.textos[i]!]),
    ) as Record<(typeof ordem)[number], string>;
    aviso({
      id: "anonimizacao",
      estado: "feito",
      detalhe: limpos.total
        ? `${limpos.total} dado(s) pessoal(is) substituído(s): ${Object.entries(limpos.removidos).map(([m, n]) => `${n}× ${m}`).join(", ")}`
        : "Nenhum dado pessoal encontrado nos documentos",
    });

    aviso({ id: "motor", estado: "fazendo" });
    const rota = definirRota(medicamento, posologia);
    aviso({
      id: "motor",
      estado: "feito",
      detalhe: `Justiça ${rota.justica === "federal" ? "Federal" : "Estadual"} · ${rota.custo.emSalariosMinimos} SM · ${rota.custeio}`,
    });

    aviso({ id: "tema6", estado: "fazendo" });
    const { avaliacoes, alertaENatJus, fontes, prompt: promptTema6 } = await analisarTema6({
      ...anonimizados,
      medicamento: medicamento.nome,
    });
    aviso({
      id: "tema6",
      estado: "feito",
      detalhe: `${fontes.length} trecho(s) do corpus citados · ${avaliacoes.length} requisito(s) avaliados`,
    });

    aviso({ id: "placar", estado: "fazendo" });
    const resumo = resumirTema6(avaliacoes);
    aviso({
      id: "placar",
      estado: "feito",
      detalhe: `${resumo.ok} ok, ${resumo.fracos} fraco(s), ${resumo.faltantes} faltando — ${resumo.aptoParaProtocolo ? "apto" : "não apto"} para protocolo`,
    });

    aviso({ id: "dossie", estado: "fazendo" });
    const dossie = await redigirDossie({
      rota, resumo, medicamento: medicamento.nome, alertaENatJus, fontes,
    });
    aviso({ id: "dossie", estado: "feito", detalhe: "Cinco peças redigidas" });

    const tema6 = { avaliacoes, resumo, alertaENatJus, fontes };

    /**
     * Transparência para auditoria: o que foi enviado ao modelo, literalmente.
     *
     * Um prompt real prova três coisas que nenhuma afirmação prova: que o texto
     * chegou anonimizado, que os números foram entregues prontos com instrução
     * de não recalcular, e que as fontes citadas vieram do corpus. Por isso é o
     * prompt renderizado do caso, não o modelo dele.
     */
    const prompts = {
      modelo: env.OPENROUTER_MODEL,
      promptVersao: PROMPT_VERSAO,
      temperatura: 0,
      zeroDataRetention: true,
      etapas: [
        {
          id: "tema6",
          titulo: "Classificação dos seis requisitos do Tema 6",
          ...promptTema6,
        },
        {
          id: "dossie",
          titulo: "Redação das cinco peças do dossiê",
          sistema: dossie.prompt?.sistema ?? "",
          usuario: dossie.prompt?.usuario ?? "",
        },
      ],
    };

    await query(
      `INSERT INTO analise (parametros_versao, entrada, rota, tema6, dossie)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        `${PARAMETROS.versao}/${PROMPT_VERSAO}`,
        JSON.stringify({ medicamento, posologia }),
        JSON.stringify(rota),
        JSON.stringify(tema6),
        JSON.stringify({ ...dossie, prompt: undefined }),
      ],
    ).catch((e) => app.log.warn({ e }, "análise não persistida"));

    return {
      rota,
      tema6,
      dossie,
      anonimizacao: { removidos: limpos.removidos, total: limpos.total },
      prompts,
      parametrosVersao: PARAMETROS.versao,
    };
  }

  /** Mesma análise, transmitindo o progresso por Server-Sent Events. */
  app.post("/analise/progresso", async (req, reply) => {
    const parsed = analiseSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: parsed.error.issues });

    const textos = Object.values(parsed.data.documentos).filter(Boolean).join("\n");
    if (PII.test(textos)) return reply.code(422).send({ erro: ERRO_CPF });
    if (!temLLM) return reply.code(503).send({ erro: AVISO_SEM_IA });

    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
      // O nginx guarda resposta em buffer por padrão, o que anularia o
      // streaming: tudo chegaria junto, no fim.
      "x-accel-buffering": "no",
    });
    const enviar = (dado: unknown) => reply.raw.write(`data: ${JSON.stringify(dado)}\n\n`);

    try {
      const resultado = await executarAnalise(parsed.data, (passo) => enviar({ tipo: "passo", ...passo }));
      enviar({ tipo: "fim", resultado });
    } catch (e) {
      req.log.error({ e }, "falha na análise com progresso");
      enviar({
        tipo: "erro",
        erro: e instanceof Error ? e.message : "Falha ao processar a análise",
      });
    } finally {
      reply.raw.end();
    }
  });

  app.post("/analise", async (req, reply) => {
    const parsed = analiseSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: parsed.error.issues });
    const { medicamento, posologia, documentos, apenasRota } = parsed.data;

    const textos = Object.values(documentos).filter(Boolean).join("\n");
    if (PII.test(textos)) return reply.code(422).send({ erro: ERRO_CPF });

    if (apenasRota || !temLLM) {
      return {
        rota: definirRota(medicamento, posologia),
        tema6: null,
        dossie: null,
        aviso: temLLM ? undefined : AVISO_SEM_IA,
        parametrosVersao: PARAMETROS.versao,
      };
    }

    // Mesma pipeline da rota com progresso, sem transmitir os passos.
    return executarAnalise(parsed.data, () => {});
  });
}
