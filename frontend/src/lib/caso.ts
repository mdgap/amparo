export interface Documentos {
  laudo: string;
  receita: string;
  notaENatJus: string;
  requerimentoAdministrativo: string;
}

export interface DadosMedicamento {
  nome: string;
  precoApresentacao: number;
  /** "orcamento" quando a apresentação não consta da CMED. */
  precoOrigem: "cmed" | "orcamento";
  unidadesPorApresentacao: number;
  comRegistroAnvisa: boolean;
  unidadesPorTomada: number;
  tomadasPorDia: number;
  diasPorAno: number;
}

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
