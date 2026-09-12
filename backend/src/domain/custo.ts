import { PARAMETROS, tetoEmReais, type Parametros } from "./parametros.ts";
import type { Medicamento, Posologia, ResultadoCusto } from "./types.ts";

/**
 * Custo anual do tratamento a partir do preço CMED e da posologia.
 * Determinístico e auditável: a `memoria` reproduz a conta linha a linha para
 * ir no dossiê. Nenhuma destas contas passa pelo LLM.
 */
export function calcularCustoAnual(
  medicamento: Medicamento,
  posologia: Posologia,
  parametros: Parametros = PARAMETROS,
): ResultadoCusto {
  if (medicamento.unidadesPorApresentacao <= 0) {
    throw new Error("unidadesPorApresentacao deve ser maior que zero");
  }
  if (medicamento.precoApresentacao < 0) {
    throw new Error("precoApresentacao não pode ser negativo");
  }
  if (posologia.diasPorAno <= 0 || posologia.diasPorAno > 366) {
    throw new Error("diasPorAno deve estar entre 1 e 366");
  }

  const unidadesPorDia = posologia.unidadesPorTomada * posologia.tomadasPorDia;
  const unidadesPorAno = unidadesPorDia * posologia.diasPorAno;

  // Apresentação é comprada inteira: arredonda para cima.
  const apresentacoesPorAno = Math.ceil(
    unidadesPorAno / medicamento.unidadesPorApresentacao,
  );
  const precoUnitario =
    medicamento.precoApresentacao / medicamento.unidadesPorApresentacao;
  const custoAnual = arredondar(
    apresentacoesPorAno * medicamento.precoApresentacao,
  );
  const salarioMinimo = parametros.salarioMinimo.valorMensal;
  const emSalariosMinimos = custoAnual / salarioMinimo;

  return {
    unidadesPorAno,
    apresentacoesPorAno,
    custoAnual,
    custoMensalMedio: arredondar(custoAnual / 12),
    precoUnitario: arredondar(precoUnitario, 4),
    emSalariosMinimos: arredondar(emSalariosMinimos, 2),
    salarioMinimoUsado: salarioMinimo,
    tetoEmReais: arredondar(tetoEmReais(parametros)),
    memoria: [
      `Posologia: ${posologia.unidadesPorTomada} un. x ${posologia.tomadasPorDia} vez(es)/dia = ${unidadesPorDia} un./dia`,
      `Duração: ${posologia.diasPorAno} dias/ano → ${unidadesPorAno} unidades/ano`,
      `Apresentação com ${medicamento.unidadesPorApresentacao} un. → ${apresentacoesPorAno} apresentações/ano (arredondado para cima)`,
      `Preço CMED (PMVG) da apresentação: ${brl(medicamento.precoApresentacao)}`,
      `Custo anual: ${apresentacoesPorAno} x ${brl(medicamento.precoApresentacao)} = ${brl(custoAnual)}`,
      `Salário mínimo usado: ${brl(salarioMinimo)} (vigência ${parametros.salarioMinimo.vigenciaDesde})`,
      `Custo anual em salários mínimos: ${brl(custoAnual)} / ${brl(salarioMinimo)} = ${sm(arredondar(emSalariosMinimos, 2))}`,
      `Teto do Tema 1234: ${parametros.tetoCompetenciaEmSalariosMinimos} SM = ${brl(tetoEmReais(parametros))}`,
    ],
  };
}

function arredondar(valor: number, casas = 2): number {
  const f = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * f) / f;
}

/** Formata salários mínimos no padrão pt-BR (vírgula decimal). */
export function sm(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SM`;
}

export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
