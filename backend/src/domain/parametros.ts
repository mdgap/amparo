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
  /**
   * Piso da faixa de ressarcimento (Guia Rápido do CNJ, nov/2025): entre este
   * piso e o teto, a ação é estadual contra o Estado, e a União ressarce.
   * Abaixo dele, o Estado custeia integralmente.
   */
  pisoRessarcimentoEmSalariosMinimos: number;
  /** Fração ressarcida pela União na faixa intermediária (0,65 = 65%). */
  fracaoRessarcimentoUniao: number;
  /**
   * O Município responde por medicamento NÃO incorporado?
   * Guia CNJ: de regra não — só com pactuação na CIB do respectivo Estado.
   */
  municipioRespondePorNaoIncorporado: boolean;
}

export const PARAMETROS: Parametros = {
  versao: "2026-02",
  salarioMinimo: {
    // TODO(equipe): confirmar o valor vigente na data do caso antes da demo.
    valorMensal: 1518.0,
    vigenciaDesde: "2025-01-01",
    fonte: "Decreto de reajuste do salário mínimo (verificar edição vigente)",
  },
  tetoCompetenciaEmSalariosMinimos: 210,
  pisoRessarcimentoEmSalariosMinimos: 7,
  fracaoRessarcimentoUniao: 0.65,
  municipioRespondePorNaoIncorporado: false,
};

/** Teto de competência em reais (custo anual do tratamento). */
export function tetoEmReais(p: Parametros = PARAMETROS): number {
  return p.tetoCompetenciaEmSalariosMinimos * p.salarioMinimo.valorMensal;
}

/** Piso da faixa de ressarcimento em reais (custo anual do tratamento). */
export function pisoEmReais(p: Parametros = PARAMETROS): number {
  return p.pisoRessarcimentoEmSalariosMinimos * p.salarioMinimo.valorMensal;
}
