import { test } from "node:test";
import assert from "node:assert/strict";
import { construirApp, type Dependencias } from "../src/app.ts";
import { montarRegistro, type LinhaAnalise, type RegistroAnalise } from "../src/domain/historico.ts";
import { definirRota } from "../src/domain/rota.ts";
import { REQUISITOS_TEMA_6 } from "../src/domain/tema6.ts";

// CPF com espaços passa pelo filtro de PII de hoje e chega ao processamento.
const CPF = "123 456 789 09";
const LAUDO = `MARCADOR-LAUDO Paciente Maria Aparecida da Silva, CPF ${CPF}, fibrose cística.`;

const caso = {
  medicamento: { nome: "Trikafta", precoApresentacao: 1000, unidadesPorApresentacao: 30, registroAnvisa: { possui: true } },
  posologia: { unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 365 },
  documentos: { laudo: LAUDO, receita: "MARCADOR-RECEITA" },
  // Dois dos seis requisitos saem da conferência, não dos documentos: sem
  // informá-los aqui o caso nunca fica apto, por regra e não por falha da IA.
  conitec: { situacao: "nunca_avaliado" as const },
  hipossuficiencia: { declaracao: true, comprovanteRenda: true },
};

function repositorioFake(linhas: LinhaAnalise[] = []) {
  const gravados: RegistroAnalise[] = [];
  return {
    gravados,
    async gravarAnalise(registro: RegistroAnalise) {
      gravados.push(registro);
    },
    async listarAnalises({ limite, antesDe }: { limite: number; antesDe?: number }) {
      return linhas.filter((l) => antesDe === undefined || Number(l.id) < antesDe).slice(0, limite);
    },
    async linhasParaMetricas() {
      return linhas;
    },
  };
}

const bancoForaDoAr = {
  async gravarAnalise(): Promise<void> {
    throw new Error(`connect ECONNREFUSED — valores: ${LAUDO}`);
  },
  async listarAnalises(): Promise<LinhaAnalise[]> {
    throw new Error("connect ECONNREFUSED");
  },
  async linhasParaMetricas(): Promise<LinhaAnalise[]> {
    throw new Error("connect ECONNREFUSED");
  },
};

/** Não anonimiza nada: prova que a proteção de erro não depende da anonimização. */
const anonimizadorInerte: Dependencias["anonimizar"] = async (textos) => ({ textos, removidos: {}, total: 0 });

const semIA: Dependencias["ia"] = {
  temLLM: false,
  analisarTema6: async () => {
    throw new Error("não deveria chamar a IA");
  },
  redigirDossie: async () => {
    throw new Error("não deveria chamar a IA");
  },
};

const comIA: Dependencias["ia"] = {
  temLLM: true,
  analisarTema6: async () => ({
    avaliacoes: REQUISITOS_TEMA_6.map((r) => ({
      id: r.id,
      status: "ok" as const,
      justificativa: `o laudo diz: ${LAUDO}`,
      evidencias: [LAUDO],
    })),
    fontes: [],
    prompt: { sistema: "sistema", usuario: `prompt com ${LAUDO}` },
  }),
  redigirDossie: async () => ({ memorando: "minuta", prompt: { sistema: "sistema", usuario: LAUDO } }) as never,
};

const falhaComEco: Dependencias["ia"] = {
  ...comIA,
  analisarTema6: async (entrada) => {
    // Provedor que ecoa o prompt na mensagem de erro.
    throw new Error(`provedor recusou o prompt: ${entrada.laudo}`);
  },
};

async function montar(deps: Partial<Dependencias> = {}) {
  const logs: string[] = [];
  const app = await construirApp({
    repositorio: repositorioFake(),
    ia: semIA,
    anonimizar: anonimizadorInerte,
    logStream: { write: (linha: string) => void logs.push(linha) },
    ...deps,
  });
  return { app, logs: () => logs.join("\n") };
}

// ---- #2: persistência, histórico e métricas --------------------------------

test("análise sem IA é gravada, sem texto de documento", async () => {
  const repositorio = repositorioFake();
  const { app } = await montar({ repositorio });

  const r = await app.inject({ method: "POST", url: "/api/analise", payload: caso });

  assert.equal(r.statusCode, 200);
  assert.equal(repositorio.gravados.length, 1);
  assert.equal(repositorio.gravados[0]!.tema6, null);
  assert.ok(!JSON.stringify(repositorio.gravados[0]).includes("MARCADOR"));
  await app.close();
});

test("conferência só da rota não entra no histórico", async () => {
  const repositorio = repositorioFake();
  const { app } = await montar({ repositorio });

  const r = await app.inject({ method: "POST", url: "/api/analise", payload: { ...caso, apenasRota: true } });

  assert.equal(r.statusCode, 200);
  assert.equal(repositorio.gravados.length, 0);
  await app.close();
});

test("com IA, a avaliação é gravada sem as evidências literais do laudo", async () => {
  const repositorio = repositorioFake();
  const { app } = await montar({ repositorio, ia: comIA });

  const r = await app.inject({ method: "POST", url: "/api/analise", payload: caso });

  assert.equal(r.statusCode, 200);
  assert.equal(repositorio.gravados.length, 1);
  assert.equal(repositorio.gravados[0]!.tema6?.resumo.aptoParaProtocolo, true);
  // O dossiê é guardado para a análise poder ser reaberta — sem o prompt.
  assert.deepEqual(repositorio.gravados[0]!.dossie, { memorando: "minuta" });
  assert.ok(!JSON.stringify(repositorio.gravados[0]).includes("MARCADOR"));
  await app.close();
});

test("a IA recebe o texto já anonimizado", async () => {
  let recebido = "";
  const anonimizar: Dependencias["anonimizar"] = async (textos) => ({
    textos: textos.map((t) => t.replace("Maria Aparecida da Silva", "[NOME]")),
    removidos: { "[NOME]": 1 },
    total: 1,
  });
  const ia: Dependencias["ia"] = {
    ...comIA,
    analisarTema6: async (entrada) => {
      recebido = entrada.laudo;
      return comIA.analisarTema6(entrada);
    },
  };
  const { app } = await montar({ ia, anonimizar });

  const r = await app.inject({ method: "POST", url: "/api/analise", payload: caso });

  assert.equal(r.statusCode, 200);
  assert.match(recebido, /\[NOME\]/);
  assert.ok(!recebido.includes("Maria Aparecida"));
  await app.close();
});

test("falha ao gravar não derruba a análise nem leva o documento ao log", async () => {
  const { app, logs } = await montar({ repositorio: bancoForaDoAr });

  const r = await app.inject({ method: "POST", url: "/api/analise", payload: caso });

  assert.equal(r.statusCode, 200);
  assert.ok(!logs().includes("MARCADOR"));
  assert.ok(!logs().includes(CPF));
  await app.close();
});

test("histórico e métricas respondem com o banco vazio", async () => {
  const { app } = await montar();

  const lista = await app.inject({ method: "GET", url: "/api/analises" });
  assert.equal(lista.statusCode, 200);
  assert.deepEqual(lista.json(), { itens: [], proximo: null });

  const metricas = await app.inject({ method: "GET", url: "/api/metricas" });
  assert.equal(metricas.statusCode, 200);
  assert.equal(metricas.json().total, 0);
  assert.equal(metricas.json().custoAnualMediano, null);
  await app.close();
});

test("histórico pagina do mais recente para o mais antigo", async () => {
  const rota = definirRota(caso.medicamento, caso.posologia);
  const linha = (id: number): LinhaAnalise => ({
    id: String(id),
    criado_em: new Date(Date.UTC(2026, 8, id)),
    ...montarRegistro({ medicamento: caso.medicamento, posologia: caso.posologia, rota, tema6: null, dossie: null }),
  });
  const { app } = await montar({ repositorio: repositorioFake([linha(3), linha(2), linha(1)]) });

  const pagina1 = (await app.inject({ method: "GET", url: "/api/analises?limite=2" })).json();
  assert.deepEqual(pagina1.itens.map((i: { id: number }) => i.id), [3, 2]);
  assert.equal(pagina1.proximo, 2);

  const pagina2 = (await app.inject({ method: "GET", url: "/api/analises?limite=2&antesDe=2" })).json();
  assert.deepEqual(pagina2.itens.map((i: { id: number }) => i.id), [1]);
  assert.equal(pagina2.proximo, null);

  const invalido = await app.inject({ method: "GET", url: "/api/analises?limite=500" });
  assert.equal(invalido.statusCode, 400);
  await app.close();
});

test("banco fora do ar: histórico responde 503 e o motor continua", async () => {
  const { app } = await montar({ repositorio: bancoForaDoAr });

  assert.equal((await app.inject({ method: "GET", url: "/api/analises" })).statusCode, 503);
  assert.equal((await app.inject({ method: "GET", url: "/api/metricas" })).statusCode, 503);

  const rota = await app.inject({ method: "POST", url: "/api/rota", payload: caso });
  assert.equal(rota.statusCode, 200);
  await app.close();
});

// ---- #4: o texto cru não vaza em resposta nem em log -----------------------

test("JSON malformado não devolve nem registra trecho do corpo", async () => {
  const { app, logs } = await montar();

  const r = await app.inject({
    method: "POST",
    url: "/api/analise",
    headers: { "content-type": "application/json" },
    payload: `{"documentos":{"laudo": ${LAUDO}}}`,
  });

  assert.equal(r.statusCode, 400);
  assert.ok(!r.body.includes("MARCADOR"), `resposta vazou: ${r.body}`);
  assert.ok(!logs().includes("MARCADOR"), "log vazou o corpo");
  await app.close();
});

test("upload de documento está no app e a falha de upload não ecoa o corpo", async () => {
  const { app, logs } = await montar();

  // Sem multipart: o upload recusa, e a recusa não pode devolver o que veio.
  const r = await app.inject({
    method: "POST",
    url: "/api/documento",
    headers: { "content-type": "application/json" },
    payload: { laudo: LAUDO },
  });

  assert.notEqual(r.statusCode, 404);
  assert.equal(typeof r.json().erro, "string");
  assert.ok(!r.body.includes("MARCADOR"));
  assert.ok(!logs().includes("MARCADOR"));
  await app.close();
});

test("erro no meio da análise não vaza o laudo nem o CPF", async () => {
  const { app, logs } = await montar({ ia: falhaComEco });

  const r = await app.inject({ method: "POST", url: "/api/analise", payload: caso });

  assert.equal(r.statusCode, 500);
  assert.equal(typeof r.json().erro, "string");
  for (const segredo of ["MARCADOR", CPF]) {
    assert.ok(!r.body.includes(segredo), `resposta vazou ${segredo}`);
    assert.ok(!logs().includes(segredo), `log vazou ${segredo}`);
  }
  await app.close();
});

test("análise com progresso: erro no meio não vaza no evento nem no log", async () => {
  // A rota de progresso sequestra a resposta (SSE) e escapa do tratador de erros.
  const { app, logs } = await montar({ ia: falhaComEco });

  const r = await app.inject({ method: "POST", url: "/api/analise/progresso", payload: caso });

  assert.equal(r.statusCode, 200);
  assert.match(r.body, /"tipo":"erro"/);
  for (const segredo of ["MARCADOR", CPF]) {
    assert.ok(!r.body.includes(segredo), `evento vazou ${segredo}`);
    assert.ok(!logs().includes(segredo), `log vazou ${segredo}`);
  }
  await app.close();
});
