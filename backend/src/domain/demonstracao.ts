/**
 * Casos de demonstração para o painel não abrir vazio numa apresentação.
 *
 * Cobrem os quatro desfechos que o painel precisa mostrar: um caso com os seis
 * requisitos localizados, um com requisito faltando, um na Justiça Federal e um
 * feito só pelo motor de regras. Os números saem do motor de verdade; o texto
 * do dossiê é fictício e diz isso. Nenhum paciente real.
 */
import { definirRota } from "./rota.ts";
import { montarRegistro, type RegistroAnalise } from "./historico.ts";
import { REQUISITOS_TEMA_6, resumirTema6 } from "./tema6.ts";
import type { AvaliacaoRequisito, Medicamento, Posologia, StatusRequisito } from "./types.ts";

/** Marca os casos de demonstração no banco — é por ela que a carga não duplica. */
export const PREFIXO_DEMONSTRACAO = "Demonstração · ";

const USO_CONTINUO: Posologia = { unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 365 };

function avaliacoes(pendencias: Record<string, StatusRequisito>): AvaliacaoRequisito[] {
  return REQUISITOS_TEMA_6.map((r) => ({
    id: r.id,
    status: pendencias[r.id] ?? "ok",
    justificativa: "",
    evidencias: [],
  }));
}

function dossieFicticio(pendenciasDoCliente: string[]) {
  return {
    memorandoDeRota: "Minuta fictícia de demonstração. Nenhum documento real foi lido neste caso.",
    requerimentoAdministrativo: "Minuta fictícia de requerimento administrativo, apenas para demonstração do painel.",
    resumoDeEvidencia: "Resumo fictício de evidência, apenas para demonstração do painel.",
    pendenciasDoCliente,
    trechoDePeticao: "Trecho fictício de petição, apenas para demonstração do painel.",
  };
}

function caso(
  nome: string,
  medicamento: Omit<Medicamento, "nome">,
  posologia: Posologia,
  leitura: { pendencias: Record<string, StatusRequisito>; paraOCliente: string[] } | null,
): RegistroAnalise {
  const med: Medicamento = { ...medicamento, nome: `${PREFIXO_DEMONSTRACAO}${nome}` };
  const av = leitura && avaliacoes(leitura.pendencias);
  return montarRegistro({
    medicamento: med,
    posologia,
    rota: definirRota(med, posologia),
    tema6: av && { avaliacoes: av, resumo: resumirTema6(av), fontes: [] },
    dossie: leitura && dossieFicticio(leitura.paraOCliente),
  });
}

export function casosDeDemonstracao(): RegistroAnalise[] {
  return [
    // Seis requisitos localizados, custo na faixa de ressarcimento da União.
    caso(
      "Lamotrigina 100 mg, caixa com 30",
      { precoApresentacao: 1800, precoOrigem: "cmed", unidadesPorApresentacao: 30, registroAnvisa: { possui: true } },
      USO_CONTINUO,
      { pendencias: {}, paraOCliente: [] },
    ),
    // Requisito faltando: não houve pedido administrativo prévio.
    caso(
      "Canabidiol 200 mg/ml, frasco com 30 ml",
      { precoApresentacao: 2500, precoOrigem: "orcamento", unidadesPorApresentacao: 30, registroAnvisa: { possui: true } },
      { unidadesPorTomada: 1, tomadasPorDia: 2, diasPorAno: 365 },
      {
        pendencias: { negativa_administrativa: "falta", impossibilidade_substituicao: "fraco" },
        paraOCliente: ["Protocolar o pedido administrativo e guardar a resposta do Estado."],
      },
    ),
    // Justiça Federal: custo anual muito acima de 210 salários mínimos.
    caso(
      "Nusinersena 12 mg, frasco-ampola",
      { precoApresentacao: 150000, precoOrigem: "cmed", unidadesPorApresentacao: 1, registroAnvisa: { possui: true } },
      { unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 4 },
      {
        pendencias: { medicina_baseada_em_evidencias: "fraco" },
        paraOCliente: ["Juntar nota técnica ou estudo que sustente a eficácia do tratamento."],
      },
    ),
    // Só o motor de regras: sem leitura por IA, abaixo do piso de 7 SM.
    caso(
      "Metilfenidato 10 mg, caixa com 30",
      { precoApresentacao: 35, precoOrigem: "cmed", unidadesPorApresentacao: 30, registroAnvisa: { possui: true } },
      USO_CONTINUO,
      null,
    ),
  ];
}
