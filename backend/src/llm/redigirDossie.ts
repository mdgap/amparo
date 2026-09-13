import { z } from "zod";
import { pedirJSON } from "./cliente.ts";
import { listaDeTextos, semMarkdown } from "./tolerante.ts";
import { SISTEMA } from "./prompts/sistema.ts";
import { montarContexto, type TrechoEncontrado } from "../rag/busca.ts";
import type { ResultadoRota } from "../domain/types.ts";
import type { ResumoTema6 } from "../domain/tema6.ts";

const schema = z.object({
  memorandoDeRota: z.string(),
  requerimentoAdministrativo: z.string(),
  resumoDeEvidencia: z.string(),
  pendenciasDoCliente: listaDeTextos,
  trechoDePeticao: z.string(),
});

export type Dossie = z.infer<typeof schema> & {
  /** O prompt exatamente como foi enviado — para auditoria. */
  prompt?: { sistema: string; usuario: string };
};

/**
 * Redige as cinco peças do dossiê. Os números (custo, SM, foro) entram no
 * prompt já calculados e o modelo é instruído a repeti-los sem recalcular.
 */
/**
 * Monta a mensagem de redação. Extraída para que a ajuda contextual mostre o
 * MESMO template, chamado com placeholders — sem risco de divergir do que é
 * realmente enviado ao modelo.
 */
export function montarPromptDossie(
  args: Parameters<typeof redigirDossie>[0],
  contexto: string,
): string {
  const { rota, resumo } = args;
  const prompt = `CONTEXTO NORMATIVO (cite como [F1], [F2]...):
${contexto}

NÚMEROS JÁ CALCULADOS PELO MOTOR — repita exatamente, não recalcule:
- Medicamento: ${args.medicamento}
- Custo anual: R$ ${rota.custo.custoAnual.toFixed(2)}
- Em salários mínimos: ${rota.custo.emSalariosMinimos} SM (salário mínimo de R$ ${rota.custo.salarioMinimoUsado.toFixed(2)})
- Justiça competente: ${rota.justica}
- Polo passivo: ${rota.poloPassivo.join(", ")}
- Custeio: ${rota.custeio}
- Fundamento da rota: ${rota.fundamento.join(" ")}
- Memória de cálculo: ${rota.custo.memoria.join(" | ")}

SITUAÇÃO DO TEMA 6: ${resumo.ok} de ${resumo.total} requisitos ok, ${resumo.fracos} fracos, ${resumo.faltantes} faltando.
Pendências apuradas: ${resumo.pendencias.join(" | ") || "nenhuma"}
${args.alertaENatJus ? `Alerta e-NatJus: ${args.alertaENatJus}` : ""}

TAREFA — produza cinco peças:
1. memorandoDeRota: memorando interno explicando foro, polo passivo e a memória de cálculo, com as fontes citadas.
2. requerimentoAdministrativo: minuta de requerimento à secretaria de saúde, pronta para preencher os dados do paciente (use [NOME], [CPF], [ENDEREÇO] como lacunas).
3. resumoDeEvidencia: o que os documentos do caso já provam, requisito a requisito.
4. pendenciasDoCliente: lista objetiva do que pedir ao cliente, em ordem de urgência.
5. trechoDePeticao: trecho de petição sobre competência e cabimento — apenas essa parte, não a petição inteira.

${resumo.aptoParaProtocolo ? "" : 'IMPORTANTE: nem todos os requisitos estão cumpridos. Abra o memorando dizendo que o caso NÃO está pronto para protocolo e que a via administrativa/documentação deve ser completada antes.'}

Responda SOMENTE com JSON: {"memorandoDeRota","requerimentoAdministrativo","resumoDeEvidencia","pendenciasDoCliente":[],"trechoDePeticao"}`;

  return prompt;
}

export async function redigirDossie(args: {
  rota: ResultadoRota;
  resumo: ResumoTema6;
  medicamento: string;
  alertaENatJus?: string;
  fontes: TrechoEncontrado[];
}): Promise<Dossie> {
  const { rota, resumo } = args;

  const prompt = montarPromptDossie(args, montarContexto(args.fontes) || "(corpus vazio — escreva 'sem fonte no corpus' onde citaria)");

  const dossie = await pedirJSON({ system: SISTEMA, prompt, schema, maxTokens: 8192 });
  const registro = { sistema: SISTEMA, usuario: prompt };

  // A instrução no prompt reduz o Markdown; a limpeza aqui é o que garante.
  return {
    ...dossie,
    memorandoDeRota: semMarkdown(dossie.memorandoDeRota),
    requerimentoAdministrativo: semMarkdown(dossie.requerimentoAdministrativo),
    resumoDeEvidencia: semMarkdown(dossie.resumoDeEvidencia),
    trechoDePeticao: semMarkdown(dossie.trechoDePeticao),
    pendenciasDoCliente: dossie.pendenciasDoCliente.map(semMarkdown),
    prompt: registro,
  };
}
