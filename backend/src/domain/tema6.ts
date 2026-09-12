import type {
  AvaliacaoRequisito,
  RequisitoTema6,
  StatusRequisito,
} from "./types.ts";

/**
 * Requisitos cumulativos do Tema 6/STF para medicamento não incorporado.
 *
 * ATENÇÃO JURÍDICA: os enunciados abaixo são a leitura de trabalho da equipe e
 * precisam ser conferidos contra o texto do acordo homologado / tese antes da
 * demo. O campo `fonte` existe para que cada item seja rastreado até o corpus.
 */
export const REQUISITOS_TEMA_6: RequisitoTema6[] = [
  {
    id: "negativa_administrativa",
    titulo: "Pedido administrativo prévio e negativa (ou mora)",
    descricao:
      "Comprovação de que o medicamento foi requerido na rede pública e houve negativa, ou decurso do prazo de resposta.",
    fonte: "Tema 6/STF; Tema 1234/STF",
    comoComprovar:
      "Protocolo do requerimento administrativo, resposta da secretaria de saúde ou comprovante do decurso de prazo.",
  },
  {
    id: "ausencia_incorporacao",
    titulo: "Não incorporação pelo SUS e pronunciamento da CONITEC",
    descricao:
      "Demonstração de que o fármaco não consta da RENAME/PCDT e de qual foi a posição da CONITEC (não incorporação, ausência de análise ou mora).",
    fonte: "Tema 6/STF; Lei 8.080/1990, art. 19-Q",
    comoComprovar:
      "Consulta à RENAME/PCDT e ao parecer da CONITEC sobre a tecnologia.",
  },
  {
    id: "laudo_fundamentado",
    titulo: "Laudo médico circunstanciado e fundamentado",
    descricao:
      "Laudo que descreve o quadro, a imprescindibilidade do fármaco e por que as alternativas do SUS são inadequadas ou ineficazes para este paciente.",
    fonte: "Tema 6/STF; Tema 106/STJ",
    comoComprovar:
      "Laudo do médico assistente com CID, histórico de tratamentos tentados e justificativa individualizada.",
  },
  {
    id: "ineficacia_alternativas_sus",
    titulo: "Ineficácia ou inadequação das alternativas disponíveis no SUS",
    descricao:
      "Registro de que as opções ofertadas pela rede foram tentadas e falharam, ou são contraindicadas no caso concreto.",
    fonte: "Tema 6/STF; Tema 106/STJ",
    comoComprovar:
      "Histórico terapêutico no laudo, prontuário, relatório de intercorrências.",
  },
  {
    id: "registro_anvisa",
    titulo: "Registro na ANVISA",
    descricao:
      "O medicamento deve ter registro válido na ANVISA para a indicação pretendida (salvo as exceções do Tema 500/STF).",
    fonte: "Tema 6/STF; Tema 500/STF",
    comoComprovar: "Consulta de registro no portal da ANVISA.",
  },
  {
    id: "hipossuficiencia",
    titulo: "Incapacidade financeira de custear o tratamento",
    descricao:
      "Demonstração de que o paciente e sua família não conseguem arcar com o custo sem comprometer a subsistência.",
    fonte: "Tema 6/STF; Tema 106/STJ",
    comoComprovar:
      "Declaração de hipossuficiência, comprovante de renda, comparativo entre renda familiar e custo anual apurado.",
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
