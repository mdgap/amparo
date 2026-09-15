import type { AvaliacaoRequisito, EntradaCaso } from "../lib/api.ts";
import type { DadosMedicamento, DadosProcessuais, Documentos } from "../lib/caso.ts";

export interface Cenario {
  id: string;
  titulo: string;
  descricao: string;
  medicamento: DadosMedicamento;
  processuais: DadosProcessuais;
  documentos: Documentos;
  achados: AvaliacaoRequisito[];
}

export const AVISO_FICTICIO = "DEMONSTRAÇÃO DO AMPARO. Caso, medicamento, valores e documentos fictícios. Sem validade clínica ou processual.";

const HISTORICO = "Alternativa fictícia A: 1 unidade ao dia, de janeiro a abril de 2026, sem resposta sustentada. Alternativa fictícia B: 1 unidade ao dia, de maio a julho de 2026, interrompida por intolerância descrita no exercício.";
const INDICACAO = "Neste exercício, o tratamento solicitado é imprescindível após a ineficácia das alternativas fictícias disponíveis na rede pública. Acompanhamento e reavaliação estão previstos no caso simulado.";
const NEGATIVA = "Pedido fictício protocolado em 10/08/2026. Negativa expressa simulada em 28/08/2026 por ausência de incorporação para a indicação do exercício.";
const NOTA = "Material demonstrativo de evidência, criado pela equipe para a interface. NÃO é nota técnica do CNJ ou do NAT-Jus. O cenário pressupõe revisão sistemática e ensaio randomizado pertinentes, com resultados favoráveis e qualidade moderada. Não existem estudo ou identificação de publicação associados a este exercício.";

function achado(id: string, status: AvaliacaoRequisito["status"], justificativa: string, evidencia: string, pendencia?: string): AvaliacaoRequisito {
  return { id, status, justificativa, evidencias: evidencia ? [evidencia] : [], pendencia };
}

function completo(id: string, titulo: string, nome: string, preco: number): Cenario {
  return {
    id, titulo,
    descricao: "Percorra um caso com os seis requisitos localizados na resposta preparada.",
    medicamento: {
      nome: `${nome} 50 mg, caixa com 30 unidades (fictício)`, principioAtivo: nome.toLowerCase(),
      precoApresentacao: preco, precoOrigem: "cmed", unidadesPorApresentacao: 30,
      comRegistroAnvisa: true, unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 365,
    },
    processuais: {
      conitec: { situacao: "nunca_avaliado", desde: "", ilegalidadeDemonstrada: false },
      hipossuficiencia: { declaracao: true, comprovanteRenda: true },
    },
    documentos: {
      laudo: `${AVISO_FICTICIO}\n\nCondição clínica fictícia, sem correspondência com paciente real. Código clínico DEMO. ${HISTORICO}\n\n${INDICACAO}\n\nPrescrição do exercício: ${nome}, 1 unidade ao dia, durante 365 dias para simular o custo. Assinatura e CRM substituídos por [PROFISSIONAL FICTÍCIO]. Não há assinatura médica real.`,
      receita: `${AVISO_FICTICIO}\n\n${nome} 50 mg. Caixa com 30 unidades. Para o exercício: 1 unidade ao dia durante 365 dias. Sem validade como prescrição.`,
      requerimentoAdministrativo: `${AVISO_FICTICIO}\n\n${NEGATIVA}\n\nÓrgão do exercício: Secretaria Estadual de Saúde. Protocolo DEMO-${id.toUpperCase()}. Declaração e comprovante de renda fictícios informados na conferência.`,
      notaENatJus: `${AVISO_FICTICIO}\n\n${NOTA}`,
    },
    achados: [
      achado("negativa_administrativa", "ok", "O pedido e a negativa estão presentes no documento fictício.", NEGATIVA),
      achado("impossibilidade_substituicao", "ok", "O exemplo descreve cada alternativa, período de uso e resultado. O status é preparado para demonstrar a interface.", HISTORICO),
      achado("medicina_baseada_em_evidencias", "ok", "O exercício pressupõe evidência pertinente. O material é demonstrativo e não comprova eficácia de um medicamento.", NOTA),
      achado("imprescindibilidade_laudo", "ok", "A resposta preparada considera os elementos clínicos e formais presentes no cenário. A assinatura é uma lacuna fictícia.", INDICACAO),
    ],
  };
}

const completa = completo("completa", "Documentação completa", "Acolhix", 1800);
const negativa = completo("negativa", "Pedido sem resposta", "Serenix", 1200);
const SEM_RESPOSTA = "Pedido fictício protocolado em 10/08/2026, sem resposta administrativa no exercício.";
negativa.descricao = "Veja o requisito em revisão enquanto o pedido administrativo aguarda resposta.";
negativa.documentos.requerimentoAdministrativo = `${AVISO_FICTICIO}\n\n${SEM_RESPOSTA}`;
negativa.achados[0] = achado("negativa_administrativa", "fraco", "Há protocolo, mas a resposta preparada não contém negativa expressa.", SEM_RESPOSTA, "Obter e conferir a resposta do órgão responsável no caso fictício.");

const tratamentos = completo("tratamentos", "Histórico incompleto", "Vitalix", 2400);
const INCOMPLETO = "O exemplo relata tentativas anteriores sem identificar doses, datas ou tempo de uso de cada alternativa.";
tratamentos.descricao = "Examine a falta de detalhes sobre tratamentos anteriores e a lista de complementações.";
tratamentos.documentos.laudo = tratamentos.documentos.laudo.replace(HISTORICO, INCOMPLETO);
tratamentos.achados[1] = achado("impossibilidade_substituicao", "fraco", "O documento fictício não detalha as alternativas já tentadas.", INCOMPLETO, "Complementar o exercício com alternativas, posologia, datas e resultados, uma a uma.");
tratamentos.achados[3] = achado("imprescindibilidade_laudo", "fraco", "O histórico incompleto exige revisão do laudo demonstrativo.", INCOMPLETO, "Revisar o histórico e a fundamentação individual do laudo fictício.");

const evidencias = completo("evidencias", "Evidência insuficiente", "Equilibrix", 3000);
const NOTA_CONTRARIA = "Material demonstrativo, sem emissão pelo CNJ ou pelo NAT-Jus. Neste cenário, a conclusão simulada é desfavorável, com qualidade baixa e alternativa fictícia C ainda não enfrentada pelo laudo.";
evidencias.descricao = "Compare uma conclusão desfavorável com o laudo e revise as pendências do cenário.";
evidencias.documentos.notaENatJus = `${AVISO_FICTICIO}\n\n${NOTA_CONTRARIA}`;
evidencias.processuais.conitec = { situacao: "desfavoravel", desde: "2026-08-01", ilegalidadeDemonstrada: false };
evidencias.processuais.hipossuficiencia.comprovanteRenda = false;
evidencias.achados[1] = achado("impossibilidade_substituicao", "fraco", "O material demonstrativo aponta a alternativa C, ausente do histórico.", NOTA_CONTRARIA, "Confrontar o laudo fictício com a alternativa C citada no material demonstrativo.");
evidencias.achados[2] = achado("medicina_baseada_em_evidencias", "fraco", "A conclusão preparada é desfavorável e a qualidade informada é baixa.", NOTA_CONTRARIA, "Reunir e examinar evidências pertinentes, inclusive conclusões desfavoráveis, sem selecionar apenas resultados favoráveis.");

const altoCusto = completo("alto-custo", "Tratamento de custo elevado", "Novatrix", 30000);
altoCusto.descricao = "Confira uma rota federal pelo custo, com memória de cálculo e minutas correspondentes.";
altoCusto.documentos.requerimentoAdministrativo = altoCusto.documentos.requerimentoAdministrativo.replace("Secretaria Estadual de Saúde", "Ministério da Saúde (União)");

const semRegistro = completo("sem-registro", "Sem registro informado", "Experimentalix", 800);
semRegistro.descricao = "Observe a rota específica e o checklist do Tema 6 como não analisado.";
semRegistro.medicamento.comRegistroAnvisa = false;
semRegistro.medicamento.precoOrigem = "orcamento";
semRegistro.documentos.requerimentoAdministrativo = semRegistro.documentos.requerimentoAdministrativo.replace("Secretaria Estadual de Saúde", "Ministério da Saúde (União)");
semRegistro.documentos.notaENatJus = "";

export const CENARIOS: readonly Cenario[] = [completa, negativa, tratamentos, evidencias, altoCusto, semRegistro];

export function entradaDoCenario(c: Cenario): EntradaCaso {
  const m = c.medicamento;
  return {
    medicamento: { nome: m.nome, precoApresentacao: m.precoApresentacao, precoOrigem: m.precoOrigem, unidadesPorApresentacao: m.unidadesPorApresentacao, registroAnvisa: { possui: m.comRegistroAnvisa } },
    posologia: { unidadesPorTomada: m.unidadesPorTomada, tomadasPorDia: m.tomadasPorDia, diasPorAno: m.diasPorAno },
    documentos: structuredClone(c.documentos),
    conitec: structuredClone(c.processuais.conitec),
    hipossuficiencia: structuredClone(c.processuais.hipossuficiencia),
  };
}
