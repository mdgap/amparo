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

export interface ResultadoRota {
  justica: Justica;
  poloPassivo: string[];
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
