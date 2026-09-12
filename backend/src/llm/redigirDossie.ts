import { z } from "zod";
import { pedirJSON } from "./cliente.ts";
import { listaDeTextos } from "./tolerante.ts";
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

export type Dossie = z.infer<typeof schema>;

/**
 * Redige as cinco peças do dossiê. Os números (custo, SM, foro) entram no
 * prompt já calculados e o modelo é instruído a repeti-los sem recalcular.
 */
export async function redigirDossie(args: {
  rota: ResultadoRota;
  resumo: ResumoTema6;
  medicamento: string;
  alertaENatJus?: string;
  fontes: TrechoEncontrado[];
}): Promise<Dossie> {
  const { rota, resumo } = args;

  const prompt = `CONTEXTO NORMATIVO (cite como [F1], [F2]...):
${montarContexto(args.fontes) || "(corpus vazio — escreva 'sem fonte no corpus' onde citaria)"}

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

  return pedirJSON({ system: SISTEMA, prompt, schema, maxTokens: 8192 });
}
