import assert from "node:assert/strict";
import { test } from "node:test";
import { CENARIOS, entradaDoCenario } from "../src/demo/cenarios.ts";
import { criarAnalise, demoApi, demoHistorico, selecionarCenario, reiniciarDemo, configurarSimulacao } from "../src/demo/api.ts";

test("seis cenários têm resultados completos e evidências presentes nos documentos fictícios", () => {
  assert.equal(CENARIOS.length, 6);
  for (const c of CENARIOS) {
    const a = criarAnalise(c, entradaDoCenario(c));
    assert.equal(a.tema6!.avaliacoes.length, 6);
    assert.ok(a.dossie!.memorandoDeRota.includes("DEMONSTRAÇÃO"));
    const documentos = Object.values(c.documentos).join("\n");
    for (const av of a.tema6!.avaliacoes.slice().filter((av) => c.achados.some((v) => v.id === av.id))) {
      for (const evidencia of av.evidencias) assert.ok(documentos.includes(evidencia));
    }
  }
  assert.equal(criarAnalise(CENARIOS[0]!, entradaDoCenario(CENARIOS[0]!)).tema6!.resumo.ok, 6);
  assert.equal(criarAnalise(CENARIOS[4]!, entradaDoCenario(CENARIOS[4]!)).rota.justica, "federal");
  assert.equal(criarAnalise(CENARIOS[5]!, entradaDoCenario(CENARIOS[5]!)).tema6!.resumo.naoAvaliados, 6);
});

test("editar preço e formulário atualiza cálculo e resumo sem aprovar documento editado", () => {
  const c = CENARIOS[0]!;
  const entrada = entradaDoCenario(c);
  entrada.medicamento.precoApresentacao = 100;
  entrada.hipossuficiencia = { declaracao: false, comprovanteRenda: false };
  const a = criarAnalise(c, entrada);
  assert.equal(a.rota.custo.custoAnual, 1300);
  assert.equal(a.tema6!.avaliacoes.find((v) => v.id === "hipossuficiencia")!.status, "falta");
  entrada.documentos!.laudo = "Documento editado pelo visitante";
  assert.equal(criarAnalise(c, entrada).tema6!.avaliacoes.find((v) => v.id === "imprescindibilidade_laudo")!.status, "nao_avaliado");
});

test("operações da demo não acessam rede nem leem arquivo; falha permite tentar novamente", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("A demo tentou acessar a rede"); });
  reiniciarDemo();
  selecionarCenario(CENARIOS[0]!.id);
  const antes = await demoHistorico.metricas();
  assert.equal(antes.total, 6);
  const arquivo = { name: "privado.pdf", text() { throw new Error("Arquivo lido"); }, arrayBuffer() { throw new Error("Arquivo lido"); } } as File;
  const lido = await demoApi.documento(arquivo, "laudo");
  assert.equal(lido.texto, CENARIOS[0]!.documentos.laudo);
  assert.ok((await demoApi.cmed("acolhix")).length);
  assert.ok((await demoApi.natjus("acolhix")).notas.length);
  assert.ok((await demoApi.conitec("acolhix")).registros.length);
  configurarSimulacao("falha");
  await assert.rejects(demoApi.analisarComProgresso(entradaDoCenario(CENARIOS[0]!), () => {}), /simulada/i);
  assert.equal((await demoHistorico.metricas()).total, 6);
  configurarSimulacao("sem-ia");
  const semIA = await demoApi.analisarComProgresso(entradaDoCenario(CENARIOS[0]!), () => {});
  assert.equal(semIA.tema6, null);
  assert.equal(semIA.dossie, null);
  configurarSimulacao("normal");
  const passos: string[] = [];
  await demoApi.analisarComProgresso(entradaDoCenario(CENARIOS[0]!), (p) => passos.push(`${p.id}:${p.estado}`));
  assert.ok(passos.includes("tema6:fazendo") && passos.includes("dossie:feito"));
  assert.equal((await demoHistorico.metricas()).total, 8);
  const h = await demoHistorico.historico({ limite: 2 });
  assert.equal(h.itens.length, 2);
  assert.ok(h.proximo);
  assert.ok((await demoHistorico.analise(h.itens[0]!.id)).dossie);
  const cpf = entradaDoCenario(CENARIOS[0]!);
  cpf.documentos!.laudo = "CPF 123.456.789-00";
  await assert.rejects(demoApi.analisarComProgresso(cpf, () => {}), /CPF/);
  reiniciarDemo();
  assert.equal((await demoHistorico.metricas()).total, 6);
});
