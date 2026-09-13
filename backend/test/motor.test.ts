import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCustoAnual } from "../src/domain/custo.ts";
import { definirRota } from "../src/domain/rota.ts";
import { resumirTema6, REQUISITOS_TEMA_6 } from "../src/domain/tema6.ts";
import { semMarkdown, semNulos } from "../src/llm/tolerante.ts";
import { classificarPdf } from "../src/documentos/pdf.ts";
import { avaliarConitec, avaliarHipossuficiencia } from "../src/domain/formulario.ts";
import {
  extrairPosologia, precoCmed, reconhecerMedicamentos, unidadesDaApresentacao,
  versaoDaTabela,
} from "../src/domain/cmed.ts";
import type { Parametros } from "../src/domain/parametros.ts";
import { PARAMETROS, tetoEmReais } from "../src/domain/parametros.ts";
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

test("um centavo abaixo do piso fica abaixo do piso mesmo exibindo 7,00 SM", () => {
  // 13 caixas x R$ 538,4607... = R$ 6.999,99 → 6,99999 SM, exibido como 7,00
  const centavoAbaixo = { ...medBase, precoApresentacao: 6999.99 / 13 };
  const r = definirRota(centavoAbaixo, contínuo, P);
  assert.equal(r.custo.custoAnual, 6999.99);
  assert.equal(r.custo.emSalariosMinimos, 7);
  assert.equal(r.faixa, "abaixo_do_piso");
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

test("exatamente no teto vai para a Justiça Federal (igual ou superior a 210 SM)", () => {
  // 210 SM = R$ 210.000 → 13 caixas de R$ 16.153,846...
  const noTeto = { ...medBase, precoApresentacao: 210000 / 13 };
  const r = definirRota(noTeto, contínuo, P);
  assert.equal(r.custo.emSalariosMinimos, 210);
  assert.equal(r.justica, "federal");
  assert.equal(r.faixa, "acima_do_teto");
  assert.deepEqual(r.poloPassivo, ["União"]);
  assert.equal(r.zonaDeAtencao, true);
});

test("um centavo abaixo do teto fica na Estadual mesmo exibindo 210,00 SM", () => {
  // 13 caixas x R$ 16.153,845384... = R$ 209.999,99 → 209,99999 SM, exibido como 210,00
  const centavoAbaixo = { ...medBase, precoApresentacao: 209999.99 / 13 };
  const r = definirRota(centavoAbaixo, contínuo, P);
  assert.equal(r.custo.custoAnual, 209999.99);
  assert.equal(r.custo.emSalariosMinimos, 210);
  assert.equal(r.justica, "estadual");
  assert.equal(r.faixa, "ressarcimento_federal");
});

test("logo abaixo do teto fica na Justiça Estadual", () => {
  // 209 SM = R$ 209.000 → 13 caixas
  const abaixo = { ...medBase, precoApresentacao: 209000 / 13 };
  const r = definirRota(abaixo, contínuo, P);
  assert.equal(r.justica, "estadual");
  assert.equal(r.faixa, "ressarcimento_federal");
  assert.deepEqual(r.poloPassivo, ["Estado"]);
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

test("unidades por apresentação só sai quando é inequívoco", () => {
  // Caixa de comprimidos: o caso que o motor de custo precisa.
  assert.equal(unidadesDaApresentacao("10 MG COM CT BL AL PLAS TRANS X 14"), 14);
  assert.equal(unidadesDaApresentacao("10 MG COM CT BL AL AL X 500"), 500);
  assert.equal(
    unidadesDaApresentacao("(300 + 125 + 50 + 30) MG COM CT BL AL PLAS PVC TRANS X 30"),
    30,
  );

  // Volume, massa e acionamento não são unidades — devolve null e o advogado preenche.
  assert.equal(unidadesDaApresentacao("25 MG/ML SOL DIL INFUS IV CT FA VD TRANS X 4ML"), null);
  assert.equal(unidadesDaApresentacao("25 MG/G CREM VAG CT BG AL X 40 G + 10 APLIC"), null);
  assert.equal(unidadesDaApresentacao("64 MCG SUS SPR NAS CT FR VD AMB X 120 ACION"), null);
  assert.equal(unidadesDaApresentacao("50 MG/ML XPE CX 50 FR PLAS OPC X 100 ML + 50 COP"), null);
});

test("preço da CMED vem em pt-BR e ausência não vira zero", () => {
  assert.equal(precoCmed("1.608,56"), 1608.56);
  assert.equal(precoCmed("23,66"), 23.66);
  assert.equal(precoCmed(30.73), 30.73);
  assert.equal(precoCmed("    -     "), null);
  assert.equal(precoCmed(""), null);
  assert.equal(precoCmed(undefined), null);
});

test("versão da tabela sai do preâmbulo da planilha", () => {
  assert.equal(versaoDaTabela("Publicada em 09/09/2026 19h30min."), "2026-09");
  assert.equal(versaoDaTabela("sem data aqui"), null);
});

test("reconhece o medicamento pelo vocabulário da CMED, sem modelo", () => {
  const vocabulario = [
    "DAPAGLIFLOZINA",
    "MALEATO DE LEVOMEPROMAZINA",
    "NIRMATRELVIR;RITONAVIR",
    "RIVAROXABANA",
  ];
  const laudo =
    "Paciente Maria da Silva, 54 anos. Indico Dapagliflozina 10 mg, " +
    "1 comprimido ao dia, uso contínuo.";

  const achados = reconhecerMedicamentos(laudo, vocabulario);
  assert.deepEqual(achados.map((a) => a.principioAtivo), ["DAPAGLIFLOZINA"]);

  // Nome de paciente não casa com princípio ativo: é essa a garantia.
  assert.equal(
    reconhecerMedicamentos("Paciente Maria da Silva, 54 anos.", vocabulario).length,
    0,
  );
});

test("reconhece a forma de sal pelo núcleo e a combinação inteira", () => {
  const vocabulario = ["MALEATO DE LEVOMEPROMAZINA", "NIRMATRELVIR;RITONAVIR"];

  // A receita escreve só "levomepromazina"; a CMED registra o maleato.
  assert.equal(
    reconhecerMedicamentos("uso de levomepromazina 25mg", vocabulario)[0]?.principioAtivo,
    "MALEATO DE LEVOMEPROMAZINA",
  );
  assert.equal(
    reconhecerMedicamentos("prescrito ritonavir", vocabulario)[0]?.principioAtivo,
    "NIRMATRELVIR;RITONAVIR",
  );
});

test("casamento é por palavra inteira, e termo curto demais é ignorado", () => {
  // "ferro" dentro de "desferroxamina" não conta — seria falso positivo.
  assert.equal(reconhecerMedicamentos("uso de desferroxamina", ["FERRO"]).length, 0);
  // Palavra inteira conta.
  assert.equal(reconhecerMedicamentos("quelante de ferro", ["FERRO"]).length, 1);
  // Termo com menos de 5 letras fica fora do vocabulário: colide com prosa.
  assert.equal(reconhecerMedicamentos("paciente com dor", ["DOR"]).length, 0);
});

test("monodroga vem antes da associação que contém o mesmo princípio", () => {
  const vocabulario = [
    "SAXAGLIPTINA;DAPAGLIFLOZINA",
    "DAPAGLIFLOZINA",
    "CLORIDRATO DE METFORMINA;GLIMEPIRIDA",
  ];
  const achados = reconhecerMedicamentos("Prescrevo Dapagliflozina 10 mg", vocabulario);
  assert.equal(achados[0]?.principioAtivo, "DAPAGLIFLOZINA");
});

test("o pleiteado vem antes do que já foi tentado", () => {
  const vocabulario = [
    "LEVETIRACETAM", "LAMOTRIGINA", "TOPIRAMATO", "CLOBAZAM", "RUFINAMIDA",
    "TETRAIDROCANABINOL;CANABIDIOL",
  ];
  // Laudo de epilepsia refratária: seis alternativas falhadas e um pedido.
  const laudo =
    "Já foram empregados, em doses adequadas, clobazam, lamotrigina, topiramato, " +
    "levetiracetam e rufinamida, sem controle satisfatório. " +
    "Considero indicada uma tentativa terapêutica com canabidiol farmacêutico.";

  const achados = reconhecerMedicamentos(laudo, vocabulario);
  assert.equal(achados[0]?.principioAtivo, "TETRAIDROCANABINOL;CANABIDIOL");
  assert.equal(achados[0]?.papel, "pedido");
  // As alternativas continuam na lista: são a prova do item (c) do Tema 6.
  assert.equal(achados.filter((a) => a.papel === "ja_tentado").length, 5);
});

test("o nome usual pode estar antes ou depois do 'DE' do princípio", () => {
  // A receita escreve "valproato"; a CMED registra "VALPROATO DE SÓDIO".
  assert.equal(
    reconhecerMedicamentos("em uso de valproato", ["VALPROATO DE SÓDIO"])[0]?.principioAtivo,
    "VALPROATO DE SÓDIO",
  );
  // E "metformina", que na CMED é "CLORIDRATO DE METFORMINA".
  assert.equal(
    reconhecerMedicamentos("uso de metformina", ["CLORIDRATO DE METFORMINA"])[0]?.principioAtivo,
    "CLORIDRATO DE METFORMINA",
  );
  // Nome de sal sozinho não identifica medicamento nenhum.
  assert.equal(reconhecerMedicamentos("cloridrato", ["CLORIDRATO DE METFORMINA"]).length, 0);
});

test("preço de orçamento sai marcado como provisório, na conta e na rota", () => {
  const semCmed = { ...medBase, precoOrigem: "orcamento" as const };
  const custo = calcularCustoAnual(semCmed, contínuo, P);

  assert.equal(custo.precoProvisorio, true);
  assert.match(custo.memoria.join(" "), /orçamento da parte autora/);
  assert.match(custo.memoria.join(" "), /PROVISÓRIO/);

  // O aviso precisa chegar ao fundamento, que é o que vai para o dossiê.
  const rota = definirRota(semCmed, contínuo, P);
  assert.match(rota.fundamento.join(" "), /oficiar a CMED/);

  // Preço da CMED não ganha nenhum desses avisos.
  const daCmed = calcularCustoAnual(medBase, contínuo, P);
  assert.equal(daCmed.precoProvisorio, false);
  assert.doesNotMatch(daCmed.memoria.join(" "), /PROVISÓRIO/);
});

test("posologia sai da receita pelos padrões usuais de prescrição", () => {
  assert.deepEqual(extrairPosologia("Uso contínuo, 1 comprimido de 12 em 12 horas."), {
    unidadesPorTomada: 1,
    tomadasPorDia: 2,
    diasPorAno: 365,
    evidencias: ["1 comprimido", "a cada 12 horas", "uso contínuo"],
  });

  const r = extrairPosologia("Tomar 2 cápsulas, duas vezes ao dia, durante 6 meses.");
  assert.equal(r.unidadesPorTomada, 2);
  assert.equal(r.tomadasPorDia, 2);
  assert.equal(r.diasPorAno, 180);

  const s = extrairPosologia("Indico Dapagliflozina 10 mg, 1 comprimido ao dia, uso contínuo.");
  assert.equal(s.unidadesPorTomada, 1);
  assert.equal(s.tomadasPorDia, 1);
  assert.equal(s.diasPorAno, 365);
});

test("dose em mg/kg não vira unidade por tomada", () => {
  // O próprio laudo manda calcular os mililitros conforme a concentração.
  const r = extrairPosologia(
    "Propõe-se início com 5 mg/kg/dia, dividido em duas administrações, " +
      "seguido de titulação para 10 mg/kg/dia.",
  );
  assert.equal(r.unidadesPorTomada, undefined);
  assert.equal(r.diasPorAno, undefined);
});

test("solução oral: o volume da tomada conta como unidade", () => {
  const r = extrairPosologia("Canabidiol 200 mg/ml. Tomar 1 ml, de 12 em 12 horas. Uso contínuo.");
  assert.equal(r.unidadesPorTomada, 1);
  assert.equal(r.tomadasPorDia, 2);
  assert.equal(r.diasPorAno, 365);
});

test("frequência abreviada da receita: 2x/dia e 12/12h", () => {
  // "2x/dia" não traz preposição — exigir "ao dia" fazia o campo ficar vazio,
  // e o formulário mantinha o valor anterior sem avisar ninguém.
  const a = extrairPosologia("Tafamidis 61 mg, 1 cápsula, via oral, 2x/dia, uso contínuo.");
  assert.equal(a.unidadesPorTomada, 1);
  assert.equal(a.tomadasPorDia, 2);
  assert.equal(a.diasPorAno, 365);

  assert.equal(extrairPosologia("1 cápsula 1x/dia").tomadasPorDia, 1);
  assert.equal(extrairPosologia("1 comprimido 3 x dia").tomadasPorDia, 3);

  // Intervalo abreviado.
  assert.equal(extrairPosologia("1 comprimido 12/12h").tomadasPorDia, 2);
  assert.equal(extrairPosologia("1 comprimido 8/8h").tomadasPorDia, 3);
});

test("null do modelo é tratado como campo ausente", () => {
  // gpt-oss-120b devolve null para dizer "não há"; zod .optional() rejeitava,
  // e a análise inteira voltava 500 depois de dois minutos de modelo.
  assert.deepEqual(
    semNulos({ alertaENatJus: null, avaliacoes: [{ id: "a", pendencia: null }] }),
    { avaliacoes: [{ id: "a" }] },
  );
  // Campo preenchido não é tocado.
  assert.deepEqual(semNulos({ a: "x", b: [1, null, 2] }), { a: "x", b: [1, 2] });
});

test("parâmetros vigentes apontam para a norma que os fixa", () => {
  assert.equal(PARAMETROS.salarioMinimo.valorMensal, 1621);
  assert.equal(PARAMETROS.salarioMinimo.vigenciaDesde, "2026-01-01");
  assert.match(PARAMETROS.salarioMinimo.fonte, /Decreto nº 12\.797/);
  assert.equal(tetoEmReais(), 340410); // 210 x R$ 1.621,00
});

test("PDF digitalizado é reconhecido como imagem, não como documento vazio", () => {
  // Laudo digital: centenas de caracteres por página.
  assert.equal(classificarPdf("a".repeat(1500), 1).natureza, "digital");
  assert.equal(classificarPdf("a".repeat(17678), 12).natureza, "digital");

  // Digitalizado: o que sai é carimbo ou número de folha, não conteúdo.
  // Seguir com isso como se fosse texto é o erro que faz o advogado achar
  // que enviou o laudo quando não enviou nada.
  assert.equal(classificarPdf("fl. 3", 1).natureza, "digitalizado");
  assert.equal(classificarPdf("1 2 3 4 5", 4).natureza, "digitalizado");

  assert.equal(classificarPdf("", 5).natureza, "vazio");
  assert.equal(classificarPdf("   \n  ", 5).natureza, "vazio");
});

test("peça do dossiê sai sem Markdown", () => {
  const bruto = [
    "MEMORANDO INTERNO",
    "",
    "1. **Situação atual** – O caso **NÃO está pronto** para protocolo.",
    "## Fundamento",
    "- comprovante de registro na ANVISA;",
    "- declaração de hipossuficiência.",
    "> Atenção: valor provisório.",
    "Use `npm` nunca. Veja [o guia](https://cnj.jus.br/guia).",
    "---",
    "*Elaborado por: equipe de triagem.*",
  ].join("\n");

  const limpo = semMarkdown(bruto);
  assert.doesNotMatch(limpo, /\*|^#|`|^>/m);
  assert.match(limpo, /1\. Situação atual – O caso NÃO está pronto para protocolo\./);
  assert.match(limpo, /— comprovante de registro na ANVISA;/);
  assert.match(limpo, /o guia \(https:\/\/cnj\.jus\.br\/guia\)/);
  assert.match(limpo, /Elaborado por: equipe de triagem\./);
  // Asterisco de multiplicação não é negrito e não pode sumir.
  assert.equal(semMarkdown("30 caixas * R$ 12,00"), "30 caixas * R$ 12,00");
});

test("mora da CONITEC é apurada por data, não por leitura de documento", () => {
  const hoje = new Date("2026-09-12T12:00:00Z");

  // Nunca avaliado: a própria ausência de pedido satisfaz o requisito.
  assert.equal(avaliarConitec({ situacao: "nunca_avaliado" }, hoje).status, "ok");

  // 180 + 90 = 270 dias. Um dia a mais é mora.
  const vencido = avaliarConitec({ situacao: "em_analise", desde: "2025-12-01" }, hoje);
  assert.equal(vencido.status, "ok");
  assert.match(vencido.justificativa, /mora na apreciação/);

  // Dentro do prazo ainda não é mora, e a pendência diz quando vence.
  const dentro = avaliarConitec({ situacao: "em_analise", desde: "2026-08-01" }, hoje);
  assert.equal(dentro.status, "fraco");
  assert.match(dentro.pendencia ?? "", /prazo vence em \d+ dia/);

  // Exatamente no limite ainda está dentro do prazo.
  const noLimite = avaliarConitec({ situacao: "em_analise", desde: "2025-12-16" }, hoje);
  assert.equal(noLimite.status, "fraco");

  // Em análise sem data não vira mora por suposição.
  assert.equal(avaliarConitec({ situacao: "em_analise" }, hoje).status, "fraco");

  // Desfavorável só é ok com demonstração da ilegalidade do ato.
  assert.equal(avaliarConitec({ situacao: "desfavoravel" }, hoje).status, "fraco");
  assert.equal(
    avaliarConitec({ situacao: "desfavoravel", ilegalidadeDemonstrada: true }, hoje).status,
    "ok",
  );

  // Nada informado é falta, com a pendência apontando o portal da CONITEC.
  const semDado = avaliarConitec({ situacao: "nao_informado" }, hoje);
  assert.equal(semDado.status, "falta");
  assert.match(semDado.pendencia ?? "", /CONITEC/);
});

test("hipossuficiência: declaração sozinha é fraco, nunca ok", () => {
  assert.equal(
    avaliarHipossuficiencia({ declaracao: true, comprovanteRenda: true }).status,
    "ok",
  );
  assert.equal(
    avaliarHipossuficiencia({ declaracao: true, comprovanteRenda: false }).status,
    "fraco",
  );
  assert.equal(
    avaliarHipossuficiencia({ declaracao: false, comprovanteRenda: false }).status,
    "falta",
  );
});

test("resposta do modelo sem avaliações não derruba a análise", () => {
  // O placar trata a ausência como "não analisado", que bloqueia o protocolo.
  const resumo = resumirTema6([]);
  assert.equal(resumo.naoAvaliados, 6);
  assert.equal(resumo.aptoParaProtocolo, false);

  // E os dois requisitos do formulário continuam valendo mesmo assim.
  const comFormulario = resumirTema6([
    avaliarConitec({ situacao: "nunca_avaliado" }, new Date("2026-09-12T12:00:00Z")),
    avaliarHipossuficiencia({ declaracao: true, comprovanteRenda: true }),
  ]);
  assert.equal(comFormulario.ok, 2);
  assert.equal(comFormulario.naoAvaliados, 4);
  assert.equal(comFormulario.aptoParaProtocolo, false);
});
