export type Via = "oral" | "injetavel" | "topico" | "outra";

export interface Medicamento {
  /** Nome como aparece na receita. */
  nome: string;
  /** Princípio ativo, se conhecido. */
  principioAtivo?: string;
  /** Apresentação conforme tabela CMED (ex.: "50 MG COM REV CT BL AL PLAS INC X 30"). */
  apresentacao?: string;
  /** Preço da apresentação (PMVG da CMED, em reais). Fonte do número. */
  precoApresentacao: number;
  /** Quantas unidades (comprimidos, ml, frascos) vêm na apresentação. */
  unidadesPorApresentacao: number;
  registroAnvisa?: { possui: boolean; numero?: string };
  incorporadoSus?: boolean;
}

export interface Posologia {
  /** Unidades por administração (ex.: 1 comprimido). */
  unidadesPorTomada: number;
  /** Administrações por dia. */
  tomadasPorDia: number;
  /** Dias de tratamento por ano (365 = contínuo). */
  diasPorAno: number;
}

export interface ResultadoCusto {
  unidadesPorAno: number;
  apresentacoesPorAno: number;
  custoAnual: number;
  custoMensalMedio: number;
  precoUnitario: number;
  emSalariosMinimos: number;
  salarioMinimoUsado: number;
  tetoEmReais: number;
  memoria: string[];
}

export type Justica = "estadual" | "federal";

/**
 * Faixa de custeio do medicamento NÃO incorporado, conforme o Guia Rápido do
 * CNJ (nov/2025). São três, não duas: o degrau de baixo muda quem paga, não o
 * foro. `sem_registro_anvisa` precede as demais (Tema 500/STF).
 */
export type FaixaCusto =
  | "sem_registro_anvisa"
  | "abaixo_do_piso"
  | "ressarcimento_federal"
  | "acima_do_teto";

export interface ResultadoRota {
  justica: Justica;
  /** Quem vai no polo passivo. Município só entra por pactuação na CIB. */
  poloPassivo: string[];
  faixa: FaixaCusto;
  /** Quem custeia o tratamento na faixa apurada — não é o mesmo que o polo. */
  custeio: string;
  fundamento: string[];
  /** true quando o custo fica a menos de 10% do teto — pede conferência humana. */
  zonaDeAtencao: boolean;
  custo: ResultadoCusto;
}

export type StatusRequisito = "ok" | "fraco" | "falta" | "nao_avaliado";

export interface RequisitoTema6 {
  id: string;
  titulo: string;
  descricao: string;
  /**
   * Critério objetivo de ok / fraco / falta, transcrito do Guia do CNJ.
   * Vai literal para o prompt: a régua é do domínio, não do modelo.
   */
  regraOk: string;
  fonte: string;
  comoComprovar: string;
}

export interface AvaliacaoRequisito {
  id: string;
  status: StatusRequisito;
  justificativa: string;
  /** Trechos do laudo/receita que sustentam a avaliação. */
  evidencias: string[];
  /** O que falta pedir ao cliente. */
  pendencia?: string;
}
