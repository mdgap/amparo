import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCustoAnual } from "../src/domain/custo.ts";
import { definirRota } from "../src/domain/rota.ts";
import { resumirTema6, REQUISITOS_TEMA_6 } from "../src/domain/tema6.ts";
import type { Parametros } from "../src/domain/parametros.ts";
import { PARAMETROS, tetoEmReais } from "../src/domain/parametros.ts";
import type { Medicamento, Posologia } from "../src/domain/types.ts";

const P: Parametros = {
  versao: "test",
  salarioMinimo: { valorMensal: 1000, vigenciaDesde: "2026-01-01", fonte: "teste" },
  tetoCompetenciaEmSalariosMinimos: 210,
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

test("abaixo do teto vai para a Justiça Estadual sem a União", () => {
  const r = definirRota(medBase, contínuo, P);
  assert.equal(r.justica, "estadual");
  assert.deepEqual(r.poloPassivo, ["Estado", "Município"]);
});

test("acima de 210 SM vai para a Justiça Federal com a União", () => {
  // 13 caixas/ano x R$ 20.000 = R$ 260.000 = 260 SM
  const caro = { ...medBase, precoApresentacao: 20000 };
  const r = definirRota(caro, contínuo, P);
  assert.equal(r.justica, "federal");
  assert.ok(r.poloPassivo.includes("União"));
});

test("exatamente no teto vai para a Justiça Federal (igual ou superior a 210 SM)", () => {
  // 210 SM = R$ 210.000 → 13 caixas de R$ 16.153,846...
  const noTeto = { ...medBase, precoApresentacao: 210000 / 13 };
  const r = definirRota(noTeto, contínuo, P);
  assert.equal(r.custo.emSalariosMinimos, 210);
  assert.equal(r.justica, "federal");
  assert.ok(r.poloPassivo.includes("União"));
  assert.equal(r.zonaDeAtencao, true);
});

test("um centavo abaixo do teto fica na Estadual mesmo exibindo 210,00 SM", () => {
  // 13 caixas x R$ 16.153,845384... = R$ 209.999,99 → 209,99999 SM, exibido como 210,00
  const centavoAbaixo = { ...medBase, precoApresentacao: 209999.99 / 13 };
  const r = definirRota(centavoAbaixo, contínuo, P);
  assert.equal(r.custo.custoAnual, 209999.99);
  assert.equal(r.custo.emSalariosMinimos, 210);
  assert.equal(r.justica, "estadual");
});

test("logo abaixo do teto fica na Justiça Estadual", () => {
  // 209 SM = R$ 209.000 → 13 caixas
  const abaixo = { ...medBase, precoApresentacao: 209000 / 13 };
  const r = definirRota(abaixo, contínuo, P);
  assert.equal(r.justica, "estadual");
  assert.deepEqual(r.poloPassivo, ["Estado", "Município"]);
});

test("sem registro na ANVISA vai para a Justiça Federal mesmo barato", () => {
  const semRegistro = { ...medBase, precoApresentacao: 10, registroAnvisa: { possui: false } };
  const r = definirRota(semRegistro, contínuo, P);
  assert.equal(r.justica, "federal");
  assert.match(r.fundamento.join(" "), /500/);
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

test("parâmetros vigentes apontam para a norma que os fixa", () => {
  assert.equal(PARAMETROS.salarioMinimo.valorMensal, 1621);
  assert.equal(PARAMETROS.salarioMinimo.vigenciaDesde, "2026-01-01");
  assert.match(PARAMETROS.salarioMinimo.fonte, /Decreto nº 12\.797/);
  assert.equal(tetoEmReais(), 340410); // 210 x R$ 1.621,00
});
