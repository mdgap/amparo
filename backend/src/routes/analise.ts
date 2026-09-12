import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { IA, Repositorio } from "../app.ts";
import { montarRegistro, type RegistroAnalise } from "../domain/historico.ts";
import { definirRota } from "../domain/rota.ts";
import { resumirTema6, REQUISITOS_TEMA_6 } from "../domain/tema6.ts";
import { PARAMETROS } from "../domain/parametros.ts";

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

export interface OpcoesAnalise {
  repositorio: Repositorio;
  ia: IA;
}

export async function rotasDeAnalise(app: FastifyInstance, { repositorio, ia }: OpcoesAnalise) {
  // Falha ao gravar não derruba a análise. Só o tipo do erro vai para o log:
  // a mensagem de um erro de banco pode carregar os valores da linha.
  const gravar = (registro: RegistroAnalise) =>
    repositorio.gravarAnalise(registro).catch((e: unknown) => {
      app.log.warn({ tipo: e instanceof Error ? e.name : typeof e }, "análise não persistida");
    });

  app.get("/requisitos", async () => ({
    requisitos: REQUISITOS_TEMA_6,
    parametros: PARAMETROS,
    iaDisponivel: ia.temLLM,
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

    if (apenasRota || !ia.temLLM) {
      // Conferir só a rota é prévia, não análise: não entra no histórico.
      if (!apenasRota) {
        await gravar(montarRegistro({ medicamento, posologia, rota, tema6: null, dossie: null }));
      }
      return {
        rota,
        tema6: null,
        dossie: null,
        aviso: ia.temLLM ? undefined : "OPENROUTER_API_KEY ausente: só o motor de regras foi executado.",
        parametrosVersao: PARAMETROS.versao,
      };
    }

    const { avaliacoes, alertaENatJus, fontes } = await ia.analisarTema6({
      ...documentos,
      medicamento: medicamento.nome,
    });
    const resumo = resumirTema6(avaliacoes);
    const dossie = await ia.redigirDossie({
      rota, resumo, medicamento: medicamento.nome, alertaENatJus, fontes,
    });

    const tema6 = { avaliacoes, resumo, alertaENatJus, fontes };

    // A resposta leva a avaliação completa; o banco guarda só status e contagens.
    await gravar(montarRegistro({ medicamento, posologia, rota, tema6, dossie }));

    return { rota, tema6, dossie, parametrosVersao: PARAMETROS.versao };
  });
}
