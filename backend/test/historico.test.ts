import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularMetricas,
  montarRegistro,
  resumirParaHistorico,
  type LinhaAnalise,
  type RegistroAnalise,
} from "../src/domain/historico.ts";
import { definirRota } from "../src/domain/rota.ts";
import { REQUISITOS_TEMA_6, resumirTema6 } from "../src/domain/tema6.ts";
import type { AvaliacaoRequisito, Medicamento, Posologia, StatusRequisito } from "../src/domain/types.ts";

const posologia: Posologia = { unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 365 };
const medicamento: Medicamento = {
  nome: "Trikafta",
  principioAtivo: "elexacaftor",
  precoApresentacao: 1000,
  unidadesPorApresentacao: 30,
  registroAnvisa: { possui: true, numero: "1.0068.1234" },
  incorporadoSus: false,
};

/** 30 unidades por caixa, uso contínuo → 13 caixas por ano. */
const comCustoAnual = (custoAnual: number): Medicamento => ({
  ...medicamento,
  precoApresentacao: custoAnual / 13,
});

/** Avaliação como o modelo devolve: com justificativa e evidência literal do laudo. */
function avaliacoes(status: Record<string, StatusRequisito> = {}): AvaliacaoRequisito[] {
  return REQUISITOS_TEMA_6.map((r) => ({
    id: r.id,
    status: status[r.id] ?? "ok",
    justificativa: "MARCADOR-JUSTIFICATIVA do modelo",
    evidencias: ["MARCADOR-EVIDENCIA trecho literal do laudo"],
    pendencia: status[r.id] ? "MARCADOR-PENDENCIA" : undefined,
  }));
}

function tema6De(av: AvaliacaoRequisito[]) {
  return { avaliacoes: av, resumo: resumirTema6(av), alertaENatJus: "MARCADOR-ALERTA", fontes: [] };
}

function linhaDe(id: number, registro: RegistroAnalise): LinhaAnalise {
  // O pg devolve BIGSERIAL como string.
  return { id: String(id), criado_em: new Date(Date.UTC(2026, 8, id)), ...registro };
}

test("registro guarda só os campos do caso, nunca texto de documento", () => {
  const medicamentoComLixo = { ...medicamento, laudo: "MARCADOR-LAUDO" } as Medicamento;
  const posologiaComLixo = { ...posologia, observacao: "MARCADOR-OBS" } as Posologia;

  const registro = montarRegistro({
    medicamento: medicamentoComLixo,
    posologia: posologiaComLixo,
    rota: definirRota(medicamento, posologia),
    tema6: null,
    dossie: null,
  });

  assert.ok(!JSON.stringify(registro).includes("MARCADOR"));
  assert.deepEqual(JSON.parse(JSON.stringify(registro.entrada)), {
    medicamento: {
      nome: "Trikafta",
      principioAtivo: "elexacaftor",
      precoApresentacao: 1000,
      unidadesPorApresentacao: 30,
      registroAnvisa: { possui: true },
      incorporadoSus: false,
    },
    posologia: { unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 365 },
  });
});

test("avaliação do Tema 6 vai para o banco sem evidência, justificativa ou pendência do modelo", () => {
  const av = avaliacoes({ negativa_administrativa: "falta" });
  const registro = montarRegistro({
    medicamento,
    posologia,
    rota: definirRota(medicamento, posologia),
    tema6: tema6De(av),
    dossie: null,
  });

  assert.ok(!JSON.stringify(registro.tema6).includes("MARCADOR"));
  assert.deepEqual(
    registro.tema6?.avaliacoes.find((a) => a.id === "negativa_administrativa"),
    { id: "negativa_administrativa", status: "falta" },
  );
  assert.equal(registro.tema6?.resumo.aptoParaProtocolo, false);
  assert.equal(registro.tema6?.resumo.faltantes, 1);
});

test("item do histórico resume a análise para a lista", () => {
  const rota = definirRota(comCustoAnual(400000), posologia);
  const item = resumirParaHistorico(
    linhaDe(7, montarRegistro({ medicamento, posologia, rota, tema6: tema6De(avaliacoes()), dossie: null })),
  );

  assert.deepEqual(item, {
    id: 7,
    criadoEm: "2026-09-07T00:00:00.000Z",
    medicamento: "Trikafta",
    custoAnual: 400000,
    emSalariosMinimos: rota.custo.emSalariosMinimos,
    justica: "federal",
    faixa: "acima_do_teto",
    placar: { ok: 6, total: 6 },
    aptoParaProtocolo: true,
    comIA: true,
  });
});

test("análise feita só pelo motor aparece no histórico sem placar", () => {
  const rota = definirRota(medicamento, posologia);
  const item = resumirParaHistorico(
    linhaDe(1, montarRegistro({ medicamento, posologia, rota, tema6: null, dossie: null })),
  );

  assert.equal(item.placar, null);
  assert.equal(item.aptoParaProtocolo, null);
  assert.equal(item.comIA, false);
});

test("métricas com banco vazio saem zeradas, sem dividir por zero", () => {
  assert.deepEqual(calcularMetricas([]), {
    total: 0,
    porJustica: { federal: 0, estadual: 0 },
    analisesComIA: 0,
    percentualApto: null,
    requisitoQueMaisReprova: null,
    custoAnualMediano: null,
  });
});

test("métricas agregam justiça, aptidão, requisito que mais reprova e custo mediano", () => {
  const registro = (custoAnual: number, tema6: ReturnType<typeof tema6De> | null) =>
    montarRegistro({
      medicamento: comCustoAnual(custoAnual),
      posologia,
      rota: definirRota(comCustoAnual(custoAnual), posologia),
      tema6,
      dossie: null,
    });

  const linhas = [
    linhaDe(1, registro(400000, tema6De(avaliacoes()))), // federal, apto
    linhaDe(2, registro(13000, tema6De(avaliacoes({ negativa_administrativa: "falta", hipossuficiencia: "fraco" })))),
    linhaDe(3, registro(5200, null)), // só motor
    linhaDe(4, registro(20000, tema6De(avaliacoes({ negativa_administrativa: "nao_avaliado" })))),
  ];

  assert.deepEqual(calcularMetricas(linhas), {
    total: 4,
    porJustica: { federal: 1, estadual: 3 },
    analisesComIA: 3,
    percentualApto: 33.3,
    // Não avaliado conta: ausência de prova é pendência (invariante 3).
    requisitoQueMaisReprova: { id: "negativa_administrativa", vezes: 2 },
    custoAnualMediano: 16500,
  });
});
