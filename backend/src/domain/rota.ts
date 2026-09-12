import { calcularCustoAnual, sm } from "./custo.ts";
import { PARAMETROS, type Parametros } from "./parametros.ts";
import type { Medicamento, Posologia, ResultadoRota } from "./types.ts";

/** Margem (em % do teto) que aciona conferência humana antes de protocolar. */
const MARGEM_ZONA_DE_ATENCAO = 0.1;

/**
 * Define justiça competente e polo passivo segundo o Tema 1234/STF.
 *
 * Regra implementada:
 *  - custo anual ATÉ 210 salários mínimos  → Justiça Estadual (Estado + Município)
 *  - custo anual ACIMA de 210 SM           → Justiça Federal (com a União)
 *  - medicamento SEM registro na ANVISA    → Justiça Federal (Tema 500/STF),
 *    independentemente do custo.
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
  const acimaDoTeto =
    custo.emSalariosMinimos > parametros.tetoCompetenciaEmSalariosMinimos;

  const fundamento: string[] = [];
  let justica: ResultadoRota["justica"];
  let poloPassivo: string[];

  if (semRegistroAnvisa) {
    justica = "federal";
    poloPassivo = ["União", "Estado", "Município"];
    fundamento.push(
      "Medicamento sem registro na ANVISA: competência da Justiça Federal com a União no polo passivo (Tema 500/STF).",
    );
  } else if (acimaDoTeto) {
    justica = "federal";
    poloPassivo = ["União", "Estado", "Município"];
    fundamento.push(
      `Custo anual de ${sm(custo.emSalariosMinimos)} supera o teto de ${parametros.tetoCompetenciaEmSalariosMinimos} SM: Justiça Federal, com a União no polo passivo (Tema 1234/STF).`,
    );
  } else {
    justica = "estadual";
    poloPassivo = ["Estado", "Município"];
    fundamento.push(
      `Custo anual de ${sm(custo.emSalariosMinimos)} não supera o teto de ${parametros.tetoCompetenciaEmSalariosMinimos} SM: Justiça Estadual, contra Estado e Município (Tema 1234/STF).`,
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
