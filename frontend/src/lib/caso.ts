export interface Documentos {
  laudo: string;
  receita: string;
  notaENatJus: string;
  requerimentoAdministrativo: string;
}

export interface DadosMedicamento {
  nome: string;
  /** Da apresentação escolhida na CMED. É por ele que a CONITEC indexa. */
  principioAtivo?: string;
  precoApresentacao: number;
  /** "orcamento" quando a apresentação não consta da CMED. */
  precoOrigem: "cmed" | "orcamento";
  unidadesPorApresentacao: number;
  comRegistroAnvisa: boolean;
  unidadesPorTomada: number;
  tomadasPorDia: number;
  diasPorAno: number;
}

/**
 * Dois dos seis requisitos não estão em laudo nem em receita: a situação na
 * CONITEC vem de consulta ao portal, e a hipossuficiência de declaração e
 * comprovante. São conferidos aqui e apurados por regra, não pelo modelo.
 */
export interface DadosProcessuais {
  conitec: {
    situacao: "nao_informado" | "nunca_avaliado" | "em_analise" | "desfavoravel";
    desde: string;
    ilegalidadeDemonstrada: boolean;
  };
  hipossuficiencia: { declaracao: boolean; comprovanteRenda: boolean };
}

export const PROCESSUAIS_VAZIOS: DadosProcessuais = {
  conitec: { situacao: "nao_informado", desde: "", ilegalidadeDemonstrada: false },
  hipossuficiencia: { declaracao: false, comprovanteRenda: false },
};

export const SITUACOES_CONITEC = [
  { valor: "nao_informado", rotulo: "Não informado" },
  { valor: "nunca_avaliado", rotulo: "Nunca avaliado pela CONITEC" },
  { valor: "em_analise", rotulo: "Pedido em análise" },
  { valor: "desfavoravel", rotulo: "Recomendação desfavorável" },
] as const;

export const DOCUMENTOS_VAZIOS: Documentos = {
  laudo: "",
  receita: "",
  notaENatJus: "",
  requerimentoAdministrativo: "",
};

export const MEDICAMENTO_VAZIO: DadosMedicamento = {
  nome: "",
  precoApresentacao: 0,
  precoOrigem: "cmed",
  unidadesPorApresentacao: 30,
  comRegistroAnvisa: true,
  unidadesPorTomada: 1,
  tomadasPorDia: 1,
  diasPorAno: 365,
};

export const CAMPOS_DOCUMENTO = [
  {
    id: "laudo" as const,
    rotulo: "Laudo médico",
    obrigatorio: true,
    ajuda: "Descreve o quadro, o histórico terapêutico e a imprescindibilidade.",
  },
  {
    id: "receita" as const,
    rotulo: "Receita",
    obrigatorio: false,
    ajuda: "Prescrição com posologia.",
  },
  {
    id: "requerimentoAdministrativo" as const,
    rotulo: "Pedido administrativo",
    obrigatorio: true,
    ajuda: "Protocolo e resposta da secretaria de saúde, ou decurso de prazo.",
  },
  {
    id: "notaENatJus" as const,
    rotulo: "Nota técnica do e-NatJus",
    obrigatorio: false,
    ajuda: "Da consulta pública, se houver nota para a tecnologia.",
  },
];

/** Caso sintético para demonstração — nenhum dado real de paciente. */
/**
 * Situação processual do caso sintético.
 *
 * O caso da demonstração é um medicamento fictício: ele nunca foi submetido à
 * CONITEC, e é isso que "nunca avaliado" diz. Sem estes valores a demonstração
 * abria com dois dos seis requisitos em erro por campo em branco, e não por
 * uma conclusão da análise — que é o oposto do que a tela precisa mostrar.
 *
 * Vale só para o caso sintético. Caso real começa em PROCESSUAIS_VAZIOS.
 */
export const PROCESSUAIS_EXEMPLO: DadosProcessuais = {
  conitec: { situacao: "nunca_avaliado", desde: "", ilegalidadeDemonstrada: false },
  hipossuficiencia: { declaracao: true, comprovanteRenda: true },
};

export const CASO_EXEMPLO: { documentos: Documentos; medicamento: DadosMedicamento } = {
  documentos: {
    laudo:
      "Paciente em acompanhamento há 3 anos, CID exemplo. Foram tentados os tratamentos disponíveis na rede pública, sem resposta clínica sustentada. Indicado uso contínuo do fármaco, sem alternativa terapêutica adequada disponível no SUS para este quadro.",
    receita: "Uso contínuo, 1 comprimido de 12 em 12 horas.",
    requerimentoAdministrativo:
      "Protocolo na secretaria estadual de saúde em 10/08/2026. Sem resposta até a presente data.",
    notaENatJus: "",
  },
  medicamento: {
    nome: "Medicamento sintético 50 mg, caixa com 30 comprimidos",
    precoApresentacao: 8420.55,
    precoOrigem: "cmed",
    unidadesPorApresentacao: 30,
    comRegistroAnvisa: true,
    unidadesPorTomada: 1,
    tomadasPorDia: 2,
    diasPorAno: 365,
  },
};

const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;

/** Guarda de PII no cliente, antes mesmo de a API recusar. */
export function temCpf(documentos: Documentos): boolean {
  return Object.values(documentos).some((t) => CPF.test(t));
}
