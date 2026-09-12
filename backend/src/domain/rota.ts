import { calcularCustoAnual, sm } from "./custo.ts";
import { PARAMETROS, type Parametros } from "./parametros.ts";
import type { Medicamento, Posologia, ResultadoRota } from "./types.ts";

/** Margem (em % do teto) que aciona conferência humana antes de protocolar. */
const MARGEM_ZONA_DE_ATENCAO = 0.1;

/**
 * Define justiça competente e polo passivo segundo o Tema 1234/STF.
 *
 * Regra implementada:
 *  - custo anual ABAIXO de 210 salários mínimos     → Justiça Estadual (Estado + Município)
 *  - custo anual IGUAL OU SUPERIOR a 210 SM         → Justiça Federal (com a União)
 *  - medicamento SEM registro na ANVISA             → Justiça Federal (Tema 500/STF),
 *    independentemente do custo.
 *
 * A tese do Tema 1234 fala em valor "igual ou superior" a 210 SM, por isso o
 * custo exatamente no teto já vai para a Justiça Federal.
 *
 * Os limites e fundamentos vêm de `parametros.ts` e do corpus normativo; a
 * revisão jurídica da equipe é obrigatória antes da demo.
 */
export function definirRota(
  medicamento: Medicamento,
  posologia: Posologia,
  parametros: Parametros = PARAMETROS,
): ResultadoRota {
  const custo = calcularCustoAnual(medicamento, posologia, parametros);
  const semRegistroAnvisa = medicamento.registroAnvisa?.possui === false;
  // Compara em reais (ambos arredondados ao centavo), não em SM: o valor em SM
  // é arredondado para 2 casas e faria R$ 340.409 (209,9994 SM) virar 210,00.
  const atingeOTeto = custo.custoAnual >= custo.tetoEmReais;

  const fundamento: string[] = [];
  let justica: ResultadoRota["justica"];
  let poloPassivo: string[];

  if (semRegistroAnvisa) {
    justica = "federal";
    poloPassivo = ["União", "Estado", "Município"];
    fundamento.push(
      "Medicamento sem registro na ANVISA: competência da Justiça Federal com a União no polo passivo (Tema 500/STF).",
    );
  } else if (atingeOTeto) {
    justica = "federal";
    poloPassivo = ["União", "Estado", "Município"];
    fundamento.push(
      `Custo anual de ${sm(custo.emSalariosMinimos)} atinge ou supera o teto de ${parametros.tetoCompetenciaEmSalariosMinimos} SM: Justiça Federal, com a União no polo passivo (Tema 1234/STF).`,
    );
  } else {
    justica = "estadual";
    poloPassivo = ["Estado", "Município"];
    fundamento.push(
      `Custo anual de ${sm(custo.emSalariosMinimos)} fica abaixo do teto de ${parametros.tetoCompetenciaEmSalariosMinimos} SM: Justiça Estadual, contra Estado e Município (Tema 1234/STF).`,
    );
  }

  const distanciaDoTeto = Math.abs(
    custo.emSalariosMinimos - parametros.tetoCompetenciaEmSalariosMinimos,
  );
  const zonaDeAtencao =
    distanciaDoTeto <=
    parametros.tetoCompetenciaEmSalariosMinimos * MARGEM_ZONA_DE_ATENCAO;

  if (zonaDeAtencao) {
    fundamento.push(
      "Atenção: o custo está a menos de 10% do teto. Confira preço CMED e posologia antes de protocolar — pequena variação muda o foro.",
    );
  }

  return { justica, poloPassivo, fundamento, zonaDeAtencao, custo };
}
