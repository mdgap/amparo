/**
 * Parâmetros oficiais versionados.
 * Tudo que muda por ato normativo mora aqui, com data e fonte, para que uma
 * atualização de salário mínimo ou de tese não exija tocar em regra de negócio.
 */
export interface Parametros {
  /** Versão do conjunto de parâmetros — vai no dossiê gerado. */
  versao: string;
  salarioMinimo: {
    valorMensal: number;
    vigenciaDesde: string;
    fonte: string;
  };
  /** Tema 1234/STF: teto de competência da Justiça Estadual, em salários mínimos. */
  tetoCompetenciaEmSalariosMinimos: number;
}

export const PARAMETROS: Parametros = {
  versao: "2026-01",
  salarioMinimo: {
    // TODO(equipe): confirmar o valor vigente na data do caso antes da demo.
    valorMensal: 1518.0,
    vigenciaDesde: "2025-01-01",
    fonte: "Decreto de reajuste do salário mínimo (verificar edição vigente)",
  },
  tetoCompetenciaEmSalariosMinimos: 210,
};

/** Teto de competência em reais (custo anual do tratamento). */
export function tetoEmReais(p: Parametros = PARAMETROS): number {
  return p.tetoCompetenciaEmSalariosMinimos * p.salarioMinimo.valorMensal;
}
