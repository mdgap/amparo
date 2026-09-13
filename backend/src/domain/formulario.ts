/**
 * Requisitos que saem do formulário, não da leitura de documento.
 *
 * Dois dos seis requisitos do Tema 6 não estão em laudo nem em receita: a
 * situação do medicamento na CONITEC vem de consulta ao portal, e a
 * hipossuficiência vem de declaração e comprovante. Pedir ao modelo que os
 * encontre nos documentos produzia "falta" em todo caso — não por falha dele,
 * mas porque o dado nunca foi perguntado.
 *
 * Aqui eles viram regra: entrada estruturada, resultado determinístico, com
 * teste. É o invariante nº 1 aplicado a requisito, não só a número.
 */
import type { AvaliacaoRequisito } from "./types.ts";

/** Prazo do art. 19-R da Lei 8.080/1990: 180 dias, prorrogáveis por 90. */
export const PRAZO_CONITEC_DIAS = 180;
export const PRORROGACAO_CONITEC_DIAS = 90;

export type SituacaoConitec =
  | "nao_informado"
  | "nunca_avaliado"
  | "em_analise"
  | "desfavoravel";

export interface DadosDaConitec {
  situacao: SituacaoConitec;
  /** Data do protocolo (em análise) ou da decisão (desfavorável), AAAA-MM-DD. */
  desde?: string;
  /** Houve demonstração da ilegalidade do ato de não incorporação? */
  ilegalidadeDemonstrada?: boolean;
}

export interface DadosDeHipossuficiencia {
  declaracao: boolean;
  comprovanteRenda: boolean;
}

/** Dias corridos entre a data informada e hoje. Null se a data não for válida. */
function diasDesde(data: string | undefined, hoje: Date): number | null {
  if (!data) return null;
  const inicio = new Date(`${data}T00:00:00Z`);
  if (Number.isNaN(inicio.getTime())) return null;
  const ms = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()) - inicio.getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Requisito (b) — ilegalidade da não incorporação ou mora da CONITEC.
 * Tese do Tema 6, item 2(b); prazos do art. 19-R da Lei 8.080/1990.
 */
export function avaliarConitec(
  dados: DadosDaConitec,
  hoje: Date = new Date(),
): AvaliacaoRequisito {
  const id = "ilegalidade_nao_incorporacao";
  const limite = PRAZO_CONITEC_DIAS + PRORROGACAO_CONITEC_DIAS;

  if (dados.situacao === "nunca_avaliado") {
    return {
      id,
      status: "ok",
      justificativa:
        "Não há pedido de incorporação do medicamento à CONITEC. A ausência de pedido é uma das hipóteses do requisito, conforme a tese do Tema 6.",
      evidencias: ["Situação informada na conferência: nunca avaliado pela CONITEC"],
    };
  }

  if (dados.situacao === "em_analise") {
    const dias = diasDesde(dados.desde, hoje);
    if (dias === null) {
      return {
        id,
        status: "fraco",
        justificativa:
          "Pedido em análise na CONITEC, mas sem data de protocolo não é possível apurar a mora.",
        evidencias: [],
        pendencia:
          "Informe a data do protocolo na CONITEC para apurar o prazo de 180 dias, prorrogável por 90.",
      };
    }
    if (dias > limite) {
      return {
        id,
        status: "ok",
        justificativa: `Pedido protocolado há ${dias} dias, acima do prazo de ${PRAZO_CONITEC_DIAS} dias prorrogável por ${PRORROGACAO_CONITEC_DIAS} (art. 19-R da Lei 8.080/1990). Caracteriza mora na apreciação.`,
        evidencias: [`Protocolo na CONITEC em ${dados.desde}`],
      };
    }
    return {
      id,
      status: "fraco",
      justificativa: `Pedido em análise há ${dias} dias, dentro do prazo de ${limite} dias do art. 19-R. Ainda não há mora.`,
      evidencias: [`Protocolo na CONITEC em ${dados.desde}`],
      pendencia: `O prazo vence em ${limite - dias} dia(s). Até lá, o requisito depende de demonstrar a ilegalidade do ato.`,
    };
  }

  if (dados.situacao === "desfavoravel") {
    if (dados.ilegalidadeDemonstrada) {
      return {
        id,
        status: "ok",
        justificativa:
          "Recomendação desfavorável da CONITEC acompanhada de demonstração da ilegalidade do ato, que é o que a tese exige nessa hipótese.",
        evidencias: [`Decisão desfavorável da CONITEC${dados.desde ? ` em ${dados.desde}` : ""}`],
      };
    }
    return {
      id,
      status: "fraco",
      justificativa:
        "Há recomendação desfavorável da CONITEC. Nessa hipótese, o deferimento judicial exige demonstração da ilegalidade do ato — que não foi informada.",
      evidencias: [`Decisão desfavorável da CONITEC${dados.desde ? ` em ${dados.desde}` : ""}`],
      pendencia:
        "Demonstre a ilegalidade do ato da CONITEC: vício de procedimento, motivação ou desconformidade com a legislação de regência.",
    };
  }

  return {
    id,
    status: "falta",
    justificativa: "A situação do medicamento na CONITEC não foi informada.",
    evidencias: [],
    pendencia:
      "Consulte o portal da CONITEC (gov.br/conitec) e informe na conferência se o medicamento nunca foi avaliado, está em análise ou teve recomendação desfavorável.",
  };
}

/** Requisito (f) — incapacidade financeira. Tese do Tema 6, item 2(f). */
export function avaliarHipossuficiencia(
  dados: DadosDeHipossuficiencia,
): AvaliacaoRequisito {
  const id = "hipossuficiencia";

  if (dados.declaracao && dados.comprovanteRenda) {
    return {
      id,
      status: "ok",
      justificativa:
        "Declaração de hipossuficiência e comprovante de renda informados. É a prova consistente que o requisito pede.",
      evidencias: ["Declaração de hipossuficiência", "Comprovante de renda"],
    };
  }

  if (dados.declaracao) {
    return {
      id,
      status: "fraco",
      justificativa:
        "Há declaração de hipossuficiência, mas sem comprovante de renda. A tese pede prova consistente, não só a declaração.",
      evidencias: ["Declaração de hipossuficiência"],
      pendencia:
        "Obter comprovante de renda: holerite, declaração de imposto de renda, extrato bancário ou CadÚnico.",
    };
  }

  return {
    id,
    status: "falta",
    justificativa: "Não há declaração de hipossuficiência nem comprovante de renda.",
    evidencias: [],
    pendencia:
      "Obter declaração de hipossuficiência assinada e comprovante de renda da família.",
  };
}

/**
 * Tradução do status do painel da CONITEC para a hipótese do requisito (b).
 *
 * O painel lista só o que foi demandado: medicamento que não aparece nele
 * nunca teve pedido de incorporação, que é uma das hipóteses da tese. Por isso
 * a ausência é informação, não falta de dado.
 */
export function situacaoDoStatusConitec(status: string): SituacaoConitec {
  const t = status.toLowerCase();
  if (t.includes("em análise") || t.includes("em analise")) return "em_analise";
  if (t.includes("não incorporação") || t.includes("nao incorporacao")) return "desfavoravel";
  if (t.includes("exclusão") || t.includes("exclusao")) return "desfavoravel";
  // Incorporado, encerrado a pedido do demandante ou por decisão da Conitec:
  // nenhum deles é "nunca avaliado" nem caracteriza mora. Fica para conferência.
  return "nao_informado";
}
