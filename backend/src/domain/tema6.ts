import type {
  AvaliacaoRequisito,
  RequisitoTema6,
  StatusRequisito,
} from "./types.ts";

/**
 * Os seis requisitos cumulativos do Tema 6/STF para medicamento NÃO
 * incorporado, na ordem e na redação do Guia Rápido do CNJ (nov/2025),
 * item 3.1 — que está no corpus e pode ser citado.
 *
 * Registro na ANVISA NÃO é um deles: é questão de competência (Tema 500), já
 * resolvida pelo motor em `rota.ts` a partir do formulário. Deixá-lo aqui fazia
 * o modelo julgar um campo que o motor já respondeu.
 *
 * PENDÊNCIA JURÍDICA: o Guia Rápido não diz se o silêncio do ente, vencido o
 * prazo, equivale a negativa (item 1). Até haver resposta, silêncio é "fraco".
 */
export const REQUISITOS_TEMA_6: RequisitoTema6[] = [
  {
    id: "negativa_administrativa",
    origem: "documento",
    titulo: "Negativa administrativa prévia",
    descricao:
      "Negativa de fornecimento na via administrativa, com ato motivado e indicação de substituto. A análise judicial não substitui o ato administrativo.",
    regraOk:
      "ok: há negativa expressa documentada. fraco: requerimento protocolado e ainda sem resposta. falta: requerimento nunca feito.",
    fonte:
      "Guia Rápido do CNJ (nov/2025), item 3.1, requisito 1; Tema 1234/STF (RE 1.366.243); SV 60",
    comoComprovar:
      "Protocolo do requerimento administrativo e a resposta da secretaria de saúde, ou comprovante do decurso de prazo.",
  },
  {
    id: "ilegalidade_nao_incorporacao",
    origem: "formulario",
    titulo: "Ilegalidade da não incorporação ou mora da CONITEC",
    descricao:
      "Ilegalidade da não incorporação pela CONITEC, ausência de pedido de incorporação, ou mora na análise (prazo de 180+90 dias).",
    regraOk:
      "ok: nunca avaliado pela CONITEC, ou em análise com o prazo de 180+90 dias vencido. fraco: em análise dentro do prazo; OU recomendação desfavorável SEM demonstração da ilegalidade do ato. falta: nada informado.",
    fonte:
      "Guia Rápido do CNJ (nov/2025), item 3.1, requisito 2; Lei 8.080/1990, arts. 19-Q e 19-R",
    comoComprovar:
      "Consulta à CONITEC com data; havendo recomendação desfavorável, peça que demonstre a ilegalidade do ato.",
  },
  {
    id: "impossibilidade_substituicao",
    origem: "documento",
    titulo: "Impossibilidade de substituição por medicamento do SUS",
    descricao:
      "Inexistência de substituto nas listas do SUS ou no PCDT. O CNJ exige que o laudo descreva os medicamentos padronizados no SUS já utilizados UM A UM, constando posologia e tempo de uso de cada um.",
    regraOk:
      "ok: o laudo descreve cada medicamento do SUS já utilizado, um a um, com posologia E tempo de uso. fraco: a nota do e-NatJus ou o PCDT aponta alternativa que o laudo não menciona; OU o laudo nomeia as alternativas sem posologia e tempo de uso; OU afirma genericamente que 'não houve resposta a outros tratamentos'. falta: o laudo não trata de alternativas. Ao marcar fraco, NOMEIE a alternativa que ficou sem resposta.",
    fonte:
      "Guia Rápido do CNJ (nov/2025), item 3.1, requisito 3, e item 5; Tema 6/STF (RE 566.471); SV 61",
    comoComprovar:
      "Laudo descrevendo cada alternativa do SUS já tentada, com posologia e tempo de uso, confrontado com a nota do e-NatJus e o PCDT.",
  },
  {
    id: "medicina_baseada_em_evidencias",
    origem: "documento",
    titulo: "Medicina baseada em evidências",
    descricao:
      "Eficácia, acurácia, efetividade e segurança comprovadas por evidência científica de alto nível: ensaio clínico randomizado, revisão sistemática ou meta-análise. A consulta ao NAT-Jus é obrigatória para não incorporados, se disponível, e a decisão não pode se basear apenas no laudo do autor.",
    regraOk:
      "ok: nota do e-NatJus favorável; OU nota condicional com qualidade alta ou moderada; OU laudo que referencia ensaio clínico randomizado, revisão sistemática ou meta-análise. fraco: nota contrária, qualidade baixa ou muito baixa, ou referência de nível inferior aos três aceitos. falta: sem nota e sem nenhuma referência no laudo.",
    fonte: "Guia Rápido do CNJ (nov/2025), item 3.1, requisito 4, e item 6",
    comoComprovar:
      "Nota técnica do e-NatJus na consulta pública; na falta dela, as referências científicas citadas pelo médico assistente.",
  },
  {
    id: "imprescindibilidade_laudo",
    origem: "documento",
    titulo: "Indicação clínica imprescindível, com laudo fundamentado",
    descricao:
      "Laudo médico específico e minucioso, com cinco elementos: CID; histórico de tratamentos COM DATAS; justificativa da dose; justificativa da duração; assinatura com CRM.",
    regraOk:
      "ok: os CINCO elementos estão presentes. fraco: falta um ou mais dos cinco, e a saída deve dizer QUAL falta. falta: laudo ausente ou genérico.",
    fonte:
      "Guia Rápido do CNJ (nov/2025), item 3.1, requisito 5; Tema 106/STJ (REsp 1.657.156)",
    comoComprovar:
      "Laudo do médico assistente contendo CID, histórico de tratamentos com datas, justificativa de dose e de duração, e assinatura com CRM.",
  },
  {
    id: "hipossuficiencia",
    origem: "formulario",
    titulo: "Incapacidade financeira",
    descricao:
      "Prova consistente da incapacidade de arcar com o custo do medicamento. O produto exibe a razão entre custo anual e renda como número, sem julgar se a pessoa é hipossuficiente: quem decide é o juízo.",
    regraOk:
      "ok: declaração de hipossuficiência E comprovante de renda. fraco: apenas a declaração. falta: nenhum dos dois.",
    fonte: "Guia Rápido do CNJ (nov/2025), item 3.1, requisito 6",
    comoComprovar:
      "Declaração de hipossuficiência e comprovante de renda: holerite, declaração de IR, extrato ou CadÚnico.",
  },
];

const PESO: Record<StatusRequisito, number> = {
  ok: 1,
  fraco: 0.5,
  falta: 0,
  nao_avaliado: 0,
};

export interface ResumoTema6 {
  total: number;
  ok: number;
  fracos: number;
  faltantes: number;
  naoAvaliados: number;
  /** 0 a 1 — indicador interno de maturidade do dossiê, não é prognóstico. */
  prontidao: number;
  /** Pronto para protocolar só quando todos os seis estão "ok". */
  aptoParaProtocolo: boolean;
  pendencias: string[];
}

/** Consolida as avaliações (vindas do LLM) sem deixar o modelo decidir o placar. */
export function resumirTema6(
  avaliacoes: AvaliacaoRequisito[],
): ResumoTema6 {
  const porId = new Map(avaliacoes.map((a) => [a.id, a]));
  const conhecidas = REQUISITOS_TEMA_6.map<AvaliacaoRequisito>(
    (r) =>
      porId.get(r.id) ?? {
        id: r.id,
        status: "nao_avaliado",
        justificativa: "Sem informação suficiente nos documentos enviados.",
        evidencias: [],
      },
  );

  const conta = (s: StatusRequisito) =>
    conhecidas.filter((a) => a.status === s).length;

  const soma = conhecidas.reduce((acc, a) => acc + PESO[a.status], 0);
  const pendencias = conhecidas
    .filter((a) => a.status !== "ok")
    .map((a) => {
      const req = REQUISITOS_TEMA_6.find((r) => r.id === a.id);
      return a.pendencia ?? `${req?.titulo}: ${req?.comoComprovar}`;
    });

  return {
    total: REQUISITOS_TEMA_6.length,
    ok: conta("ok"),
    fracos: conta("fraco"),
    faltantes: conta("falta"),
    naoAvaliados: conta("nao_avaliado"),
    prontidao: Math.round((soma / REQUISITOS_TEMA_6.length) * 100) / 100,
    aptoParaProtocolo: conta("ok") === REQUISITOS_TEMA_6.length,
    pendencias,
  };
}
