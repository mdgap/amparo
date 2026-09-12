import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCustoAnual } from "../src/domain/custo.ts";
import { definirRota } from "../src/domain/rota.ts";
import { resumirTema6, REQUISITOS_TEMA_6 } from "../src/domain/tema6.ts";
import type { Parametros } from "../src/domain/parametros.ts";
import type { Medicamento, Posologia } from "../src/domain/types.ts";

const P: Parametros = {
  versao: "test",
  salarioMinimo: { valorMensal: 1000, vigenciaDesde: "2026-01-01", fonte: "teste" },
  tetoCompetenciaEmSalariosMinimos: 210,
  pisoRessarcimentoEmSalariosMinimos: 7,
  fracaoRessarcimentoUniao: 0.65,
  municipioRespondePorNaoIncorporado: false,
};

const medBase: Medicamento = {
  nome: "Teste 50mg",
  precoApresentacao: 1000,
  unidadesPorApresentacao: 30,
  registroAnvisa: { possui: true },
};
const contínuo: Posologia = { unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 365 };

test("custo anual arredonda apresentações para cima", () => {
  const r = calcularCustoAnual(medBase, contínuo, P);
  assert.equal(r.unidadesPorAno, 365);
  assert.equal(r.apresentacoesPorAno, 13); // 365/30 = 12,17 → 13 caixas
  assert.equal(r.custoAnual, 13000);
  assert.equal(r.emSalariosMinimos, 13);
});

test("custo rejeita entrada inválida em vez de gerar número errado", () => {
  assert.throws(() => calcularCustoAnual({ ...medBase, unidadesPorApresentacao: 0 }, contínuo, P));
  assert.throws(() => calcularCustoAnual(medBase, { ...contínuo, diasPorAno: 0 }, P));
});

test("entre o piso e o teto: Estadual contra o Estado, com ressarcimento da União", () => {
  // 13 caixas/ano x R$ 1.000 = R$ 13.000 = 13 SM
  const r = definirRota(medBase, contínuo, P);
  assert.equal(r.justica, "estadual");
  assert.equal(r.faixa, "ressarcimento_federal");
  assert.deepEqual(r.poloPassivo, ["Estado"]);
  assert.match(r.custeio, /65%/);
});

test("abaixo de 7 SM: Estadual, e o Estado custeia integralmente", () => {
  // 13 caixas/ano x R$ 400 = R$ 5.200 = 5,2 SM
  const barato = { ...medBase, precoApresentacao: 400 };
  const r = definirRota(barato, contínuo, P);
  assert.equal(r.custo.emSalariosMinimos, 5.2);
  assert.equal(r.justica, "estadual");
  assert.equal(r.faixa, "abaixo_do_piso");
  assert.deepEqual(r.poloPassivo, ["Estado"]);
  assert.match(r.custeio, /integralmente/);
});

test("exatamente no piso de 7 SM fica na faixa de ressarcimento", () => {
  const noPiso = { ...medBase, precoApresentacao: 7000 / 13 };
  const r = definirRota(noPiso, contínuo, P);
  assert.equal(r.custo.emSalariosMinimos, 7);
  assert.equal(r.faixa, "ressarcimento_federal");
});

test("Município fora do polo por não incorporado, salvo pactuação na CIB", () => {
  const semPactuacao = definirRota(medBase, contínuo, P);
  assert.ok(!semPactuacao.poloPassivo.includes("Município"));
  assert.match(semPactuacao.fundamento.join(" "), /CIB/);

  const comPactuacao = definirRota(medBase, contínuo, {
    ...P, municipioRespondePorNaoIncorporado: true,
  });
  assert.deepEqual(comPactuacao.poloPassivo, ["Estado", "Município"]);
});

test("acima de 210 SM vai para a Justiça Federal com a União", () => {
  // 13 caixas/ano x R$ 20.000 = R$ 260.000 = 260 SM
  const caro = { ...medBase, precoApresentacao: 20000 };
  const r = definirRota(caro, contínuo, P);
  assert.equal(r.justica, "federal");
  assert.equal(r.faixa, "acima_do_teto");
  assert.deepEqual(r.poloPassivo, ["União"]);
});

test("exatamente no teto permanece na Justiça Estadual", () => {
  // 210 SM = R$ 210.000 → 13 caixas de R$ 16.153,846...
  const noTeto = { ...medBase, precoApresentacao: 210000 / 13 };
  const r = definirRota(noTeto, contínuo, P);
  assert.equal(r.custo.emSalariosMinimos, 210);
  assert.equal(r.justica, "estadual");
  assert.equal(r.zonaDeAtencao, true);
});

test("sem registro na ANVISA vai para a Justiça Federal mesmo barato", () => {
  const semRegistro = { ...medBase, precoApresentacao: 10, registroAnvisa: { possui: false } };
  const r = definirRota(semRegistro, contínuo, P);
  assert.equal(r.justica, "federal");
  assert.equal(r.faixa, "sem_registro_anvisa");
  assert.deepEqual(r.poloPassivo, ["União"]);
  assert.match(r.fundamento.join(" "), /500/);
  // A regra geral é de impedimento, não de fornecimento com ressalva.
  assert.match(r.fundamento.join(" "), /IMPEDE/);
});

test("medicamento incorporado ao SUS sai com aviso de conferência humana", () => {
  const r = definirRota({ ...medBase, incorporadoSus: true }, contínuo, P);
  assert.match(r.fundamento.join(" "), /Componente/);
});

test("os seis requisitos são os seis do Guia do CNJ, nem mais nem menos", () => {
  // Guarda de regressão: registro na ANVISA é competência (Tema 500), não
  // requisito de mérito; evidência científica é o requisito 4 e já faltou.
  assert.deepEqual(
    REQUISITOS_TEMA_6.map((r) => r.id),
    [
      "negativa_administrativa",
      "ilegalidade_nao_incorporacao",
      "impossibilidade_substituicao",
      "medicina_baseada_em_evidencias",
      "imprescindibilidade_laudo",
      "hipossuficiencia",
    ],
  );
  // Todo requisito precisa de régua de classificação e de fonte citável.
  for (const r of REQUISITOS_TEMA_6) {
    assert.ok(r.regraOk.includes("ok:"), `${r.id} sem regra de ok`);
    assert.match(r.fonte, /CNJ/, `${r.id} sem fonte no corpus`);
  }
});

test("o item de substituição exige posologia e tempo de uso, um a um", () => {
  const c = REQUISITOS_TEMA_6.find((r) => r.id === "impossibilidade_substituicao");
  assert.match(c!.regraOk, /posologia E tempo de uso/);
  // Nomear sem posologia e tempo de uso é fraco, não ok.
  assert.match(c!.regraOk, /sem posologia e tempo de uso/);
});

test("Tema 6 só libera protocolo com os seis requisitos ok", () => {
  const todosOk = REQUISITOS_TEMA_6.map((r) => ({
    id: r.id, status: "ok" as const, justificativa: "", evidencias: [],
  }));
  assert.equal(resumirTema6(todosOk).aptoParaProtocolo, true);

  const umFraco = todosOk.map((a, i) => (i === 0 ? { ...a, status: "fraco" as const } : a));
  const resumo = resumirTema6(umFraco);
  assert.equal(resumo.aptoParaProtocolo, false);
  assert.equal(resumo.pendencias.length, 1);
});

test("requisito ausente na resposta do LLM vira pendência, não aprovação", () => {
  const resumo = resumirTema6([]);
  assert.equal(resumo.naoAvaliados, 6);
  assert.equal(resumo.aptoParaProtocolo, false);
  assert.equal(resumo.prontidao, 0);
});
