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
    // https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm
    valorMensal: 1621.0,
    vigenciaDesde: "2026-01-01",
    fonte: "Decreto nº 12.797, de 23 de dezembro de 2025",
  },
  // RE 1.366.243/SC (Tema 1234/STF), acórdão de mérito publicado em 11/10/2024.
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
