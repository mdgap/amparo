import { z } from "zod";
import { pedirJSON } from "./cliente.ts";
import { listaDeTextos } from "./tolerante.ts";
import { SISTEMA } from "./prompts/sistema.ts";
import { REQUISITOS_TEMA_6 } from "../domain/tema6.ts";
import { buscarCorpus, montarContexto } from "../rag/busca.ts";
import type { AvaliacaoRequisito } from "../domain/types.ts";

const schema = z.object({
  avaliacoes: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["ok", "fraco", "falta"]),
      justificativa: z.string(),
      evidencias: listaDeTextos.default([]),
      pendencia: z.string().optional(),
    }),
  ),
  alertaENatJus: z.string().optional(),
});

export interface EntradaTema6 {
  /** Texto do laudo médico, já anonimizado. */
  laudo: string;
  /** Texto da receita, já anonimizado. */
  receita?: string;
  /** Texto da nota técnica do e-NatJus, se houver. */
  notaENatJus?: string;
  /** Houve requerimento administrativo? Resultado. */
  requerimentoAdministrativo?: string;
  medicamento: string;
}

/**
 * Classifica cada requisito do Tema 6 em ok / fraco / falta a partir dos
 * documentos do caso, cruzando com a nota do e-NatJus quando existir.
 * O placar final é calculado por `resumirTema6`, não pelo modelo.
 */
export async function analisarTema6(entrada: EntradaTema6): Promise<{
  avaliacoes: AvaliacaoRequisito[];
  alertaENatJus?: string;
  fontes: Awaited<ReturnType<typeof buscarCorpus>>;
}> {
  const fontes = await buscarCorpus(
    `requisitos do Tema 6 do STF para medicamento não incorporado ${entrada.medicamento}`,
  );

  const requisitos = REQUISITOS_TEMA_6.map(
    (r) =>
      `- ${r.id}: ${r.titulo}\n  ${r.descricao}\n  REGRA DE CLASSIFICAÇÃO: ${r.regraOk}`,
  ).join("\n");

  const prompt = `CONTEXTO NORMATIVO (cite como [F1], [F2]...):
${montarContexto(fontes) || "(corpus vazio — responda 'sem fonte no corpus')"}

REQUISITOS A AVALIAR:
${requisitos}

DOCUMENTOS DO CASO:
<medicamento>${entrada.medicamento}</medicamento>
<laudo>${entrada.laudo}</laudo>
<receita>${entrada.receita ?? "(não enviada)"}</receita>
<requerimento_administrativo>${entrada.requerimentoAdministrativo ?? "(não informado)"}</requerimento_administrativo>
<nota_e_natjus>${entrada.notaENatJus ?? "(não enviada)"}</nota_e_natjus>

TAREFA:
1. Para CADA requisito, devolva "ok", "fraco" ou "falta" seguindo a REGRA DE CLASSIFICAÇÃO daquele item, literalmente. A regra é do domínio jurídico: não a flexibilize nem aplique critério próprio. Na dúvida entre dois status, escolha o MENOS favorável — ausência de prova é pendência, nunca aprovação.
2. Em "evidencias", copie trechos LITERAIS dos documentos do caso que sustentam o status. Sem trecho literal, o status não pode ser "ok".
3. Em "pendencia", escreva o que o cliente precisa providenciar, quando o status não for "ok".
4. Se a nota do e-NatJus apontar alternativa disponível no SUS que o laudo não enfrenta, descreva isso em "alertaENatJus".

Responda SOMENTE com JSON: {"avaliacoes":[{"id","status","justificativa","evidencias","pendencia"}],"alertaENatJus"}`;

  const saida = await pedirJSON({ system: SISTEMA, prompt, schema });

  const validos = new Set(REQUISITOS_TEMA_6.map((r) => r.id));
  return {
    avaliacoes: saida.avaliacoes.filter((a) => validos.has(a.id)),
    alertaENatJus: saida.alertaENatJus,
    fontes,
  };
}
