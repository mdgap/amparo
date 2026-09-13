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
      "Laudo fundamentado e circunstanciado do médico que assiste o paciente, comprovando a imprescindibilidade do medicamento, descrevendo o tratamento já realizado e atestando a ineficácia dos fármacos fornecidos pelo SUS para a moléstia.",
    regraOk:
      "ok: os CINCO elementos estão presentes. fraco: falta um ou mais dos cinco, e a saída deve dizer QUAL falta. falta: laudo ausente ou genérico.",
    fonte:
      "Tema 6/STF (RE 566.471), item 2, alínea 'e'; Tema 106/STJ (REsp 1.657.156), requisito (i); Guia Rápido do CNJ (nov/2025), item 3.1, requisito 5, e item 5",
    comoComprovar:
      "Laudo do médico assistente que ateste a imprescindibilidade e a ineficácia dos fármacos do SUS, descrevendo o tratamento já realizado, com CID, datas, justificativa de dose e de duração, e assinatura com CRM.",
    notaDeAplicacao:
      "A tese exige laudo 'fundamentado e circunstanciado' (STJ) e 'específico e minucioso' (CNJ) — nenhuma das duas enumera elementos. Da tese vêm a imprescindibilidade, a descrição do tratamento já realizado e a atestação de ineficácia dos fármacos do SUS. CID, datas, justificativa de dose e de duração e CRM são conferência operacional do Amparo para dar concretude a 'minucioso', não requisitos listados na norma.",
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

/**
 * O Tema 6 alcança medicamento REGISTRADO na ANVISA: "é possível,
 * excepcionalmente, a concessão judicial de medicamento registrado na ANVISA,
 * mas não incorporado às listas". Sem registro, o teste é outro — os três
 * requisitos do item 3 do Tema 500 — e rodar os seis daqui entregaria ao
 * advogado o checklist do caso de outra pessoa.
 *
 * O requisito da CONITEC é o mais evidente: não há o que incorporar, porque o
 * art. 19-T, II da Lei 8.080/1990 veda a dispensação no SUS de medicamento sem
 * registro na ANVISA.
 */
export const PENDENCIA_TEMA_500 =
  "Medicamento sem registro na ANVISA: o caso não segue o Tema 6. Comprove os três requisitos do Tema 500 — pedido de registro no Brasil (salvo órfãos e doenças raras), registro em agência de regulação estrangeira renomada e inexistência de substituto terapêutico registrado no Brasil —, além da mora irrazoável da ANVISA.";

/**
 * Item 3, alínea b, do Tema 6: o juízo deve consultar o NAT-Jus sempre que
 * disponível na jurisdição e NÃO pode fundamentar a decisão unicamente em
 * prescrição, relatório ou laudo juntado pelo autor — sob pena de nulidade
 * (CPC, art. 489, § 1º, V e VI, c/c art. 927, III, § 1º).
 *
 * Não é requisito a cargo do autor: é dever do juízo. Mas quem protocola sem a
 * nota entrega uma decisão exposta à nulidade, e isso é problema do advogado.
 * Por isso o alerta sai aqui, e não como um sétimo requisito.
 */
export function alertaDeNulidade(temNotaENatJus: boolean): string | null {
  if (temNotaENatJus) return null;
  return "Nota técnica do NAT-Jus não juntada. O item 3, alínea b, do Tema 6 exige consulta prévia ao NAT-Jus sempre que disponível na jurisdição e veda decisão fundada unicamente no laudo do autor, sob pena de nulidade. Busque a nota na consulta pública do e-NatJus antes de protocolar; não havendo, requeira na inicial a consulta ao núcleo ou a ente com expertise técnica.";
}

/** Os seis como "não avaliado", dizendo por quê. Não chama o modelo. */
export function avaliacoesSemRegistroAnvisa(): AvaliacaoRequisito[] {
  return REQUISITOS_TEMA_6.map((r) => ({
    id: r.id,
    status: "nao_avaliado" as const,
    justificativa:
      "Não avaliado: o Tema 6 alcança medicamento registrado na ANVISA. Sem registro, aplica-se o Tema 500.",
    evidencias: [],
    pendencia: PENDENCIA_TEMA_500,
  }));
}

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

/**
 * Os seis na ordem canônica: o que o modelo e o formulário devolveram, e
 * "não avaliado" para o que ninguém respondeu — requisito ausente é pendência
 * (invariante 3), então tem de aparecer, não sumir.
 *
 * Id repetido resolve pela última entrada. Como o formulário entra depois da
 * leitura, prevalece a regra sobre a interpretação do modelo.
 *
 * É esta lista, e não a crua, que vai para o placar E para o dossiê: as duas
 * peças precisam falar do mesmo conjunto.
 */
export function consolidarAvaliacoes(
  avaliacoes: AvaliacaoRequisito[],
): AvaliacaoRequisito[] {
  const porId = new Map(avaliacoes.map((a) => [a.id, a]));
  return REQUISITOS_TEMA_6.map<AvaliacaoRequisito>(
    (r) =>
      porId.get(r.id) ?? {
        id: r.id,
        status: "nao_avaliado",
        justificativa: "Sem informação suficiente nos documentos enviados.",
        evidencias: [],
      },
  );
}

/** Consolida as avaliações (vindas do LLM) sem deixar o modelo decidir o placar. */
export function resumirTema6(
  avaliacoes: AvaliacaoRequisito[],
): ResumoTema6 {
  const conhecidas = consolidarAvaliacoes(avaliacoes);

  const conta = (s: StatusRequisito) =>
    conhecidas.filter((a) => a.status === s).length;

  const soma = conhecidas.reduce((acc, a) => acc + PESO[a.status], 0);
  const pendencias = [
    ...new Set(
      conhecidas
        .filter((a) => a.status !== "ok")
        .map((a) => {
          const req = REQUISITOS_TEMA_6.find((r) => r.id === a.id);
          return a.pendencia ?? `${req?.titulo}: ${req?.comoComprovar}`;
        }),
    ),
  ];

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
