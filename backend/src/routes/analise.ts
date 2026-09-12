import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { definirRota } from "../domain/rota.ts";
import { resumirTema6, REQUISITOS_TEMA_6 } from "../domain/tema6.ts";
import { PARAMETROS } from "../domain/parametros.ts";
import { analisarTema6 } from "../llm/analisarTema6.ts";
import { redigirDossie } from "../llm/redigirDossie.ts";
import { PROMPT_VERSAO } from "../llm/prompts/sistema.ts";
import { query } from "../db.ts";
import { temLLM } from "../env.ts";

const medicamentoSchema = z.object({
  nome: z.string().min(1),
  principioAtivo: z.string().optional(),
  apresentacao: z.string().optional(),
  precoApresentacao: z.number().nonnegative(),
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

  app.post("/analise", async (req, reply) => {
    const parsed = analiseSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: parsed.error.issues });
    const { medicamento, posologia, documentos, apenasRota } = parsed.data;

    const textos = Object.values(documentos).filter(Boolean).join("\n");
    if (PII.test(textos)) {
      return reply.code(422).send({
        erro: "CPF detectado nos documentos. Remova dados pessoais antes de enviar — a ferramenta trabalha sem identificação do paciente.",
      });
    }

    const rota = definirRota(medicamento, posologia);

    if (apenasRota || !temLLM) {
      return {
        rota,
        tema6: null,
        dossie: null,
        aviso: temLLM ? undefined : "OPENROUTER_API_KEY ausente: só o motor de regras foi executado.",
        parametrosVersao: PARAMETROS.versao,
      };
    }

    const { avaliacoes, alertaENatJus, fontes } = await analisarTema6({
      ...documentos,
      medicamento: medicamento.nome,
    });
    const resumo = resumirTema6(avaliacoes);
    const dossie = await redigirDossie({
      rota, resumo, medicamento: medicamento.nome, alertaENatJus, fontes,
    });

    const tema6 = { avaliacoes, resumo, alertaENatJus, fontes };

    await query(
      `INSERT INTO analise (parametros_versao, entrada, rota, tema6, dossie)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        `${PARAMETROS.versao}/${PROMPT_VERSAO}`,
        JSON.stringify({ medicamento, posologia }), // documentos não são persistidos
        JSON.stringify(rota),
        JSON.stringify(tema6),
        JSON.stringify(dossie),
      ],
    ).catch((e) => app.log.warn({ e }, "análise não persistida"));

    return { rota, tema6, dossie, parametrosVersao: PARAMETROS.versao };
  });
}
