import { test } from "node:test";
import assert from "node:assert/strict";
import { construirApp, type Dependencias } from "../src/app.ts";
import { casosDeDemonstracao, PREFIXO_DEMONSTRACAO } from "../src/domain/demonstracao.ts";
import { montarRegistro, type LinhaAnalise } from "../src/domain/historico.ts";
import { definirRota } from "../src/domain/rota.ts";
import { REQUISITOS_TEMA_6, resumirTema6 } from "../src/domain/tema6.ts";

const medicamento = {
  nome: "Nusinersena",
  precoApresentacao: 150000,
  unidadesPorApresentacao: 1,
  registroAnvisa: { possui: true },
};
// 4 doses por ano x R$ 150.000 = R$ 600.000 — acima do teto de 210 SM.
const posologia = { unidadesPorTomada: 1, tomadasPorDia: 1, diasPorAno: 4 };

function linha(id: number, comIA: boolean): LinhaAnalise {
  const avaliacoes = REQUISITOS_TEMA_6.map((r) => ({
    id: r.id,
    status: r.id === "negativa_administrativa" ? ("falta" as const) : ("ok" as const),
    justificativa: "MARCADOR-JUSTIFICATIVA",
    evidencias: ["MARCADOR-EVIDENCIA"],
  }));
  return {
    id: String(id),
    criado_em: "2026-09-12T10:00:00.000Z",
    parametros_versao: "2026-02/v3",
    ...montarRegistro({
      medicamento,
      posologia,
      rota: definirRota(medicamento, posologia),
      tema6: comIA ? { avaliacoes, resumo: resumirTema6(avaliacoes), fontes: [] } : null,
      dossie: comIA ? { memorandoDeRota: "memorando", pendenciasDoCliente: ["negativa do Estado"] } : null,
    }),
  };
}

function repositorio(linhas: LinhaAnalise[]): Dependencias["repositorio"] {
  return {
    gravarAnalise: async () => {},
    listarAnalises: async () => linhas,
    linhasParaMetricas: async () => linhas,
    buscarAnalise: async (id) => linhas.find((l) => Number(l.id) === id) ?? null,
  };
}

async function montar(repo: Dependencias["repositorio"]) {
  return construirApp({
    repositorio: repo,
    ia: {
      temLLM: false,
      analisarTema6: async () => {
        throw new Error("não deveria chamar a IA");
      },
      redigirDossie: async () => {
        throw new Error("não deveria chamar a IA");
      },
    },
    anonimizar: async (textos) => ({ textos, removidos: {}, total: 0 }),
    logStream: { write: () => {} },
  });
}

test("reabrir uma análise devolve rota, placar e dossiê no formato da tela", async () => {
  const app = await montar(repositorio([linha(7, true)]));

  const r = await app.inject({ method: "GET", url: "/api/analises/7" });

  assert.equal(r.statusCode, 200);
  const analise = r.json();
  assert.equal(analise.id, 7);
  assert.equal(analise.codigo, "Caso 0007");
  assert.equal(analise.rota.justica, "federal");
  assert.equal(analise.tema6.resumo.faltantes, 1);
  assert.deepEqual(analise.tema6.resumo.pendencias, []);
  // O banco não guarda evidência nem justificativa: a tela recebe vazio, não inventado.
  assert.deepEqual(
    analise.tema6.avaliacoes.find((a: { id: string }) => a.id === "negativa_administrativa"),
    { id: "negativa_administrativa", status: "falta", justificativa: "", evidencias: [] },
  );
  assert.deepEqual(analise.tema6.fontes, []);
  assert.deepEqual(analise.dossie, { memorandoDeRota: "memorando", pendenciasDoCliente: ["negativa do Estado"] });
  assert.equal(analise.parametrosVersao, "2026-02/v3");
  assert.equal(analise.reaberta, true);
  assert.ok(!r.body.includes("MARCADOR"));
  await app.close();
});

test("análise feita só pelo motor reabre com aviso e sem placar", async () => {
  const app = await montar(repositorio([linha(3, false)]));

  const analise = (await app.inject({ method: "GET", url: "/api/analises/3" })).json();

  assert.equal(analise.tema6, null);
  assert.equal(analise.dossie, null);
  assert.equal(typeof analise.aviso, "string");
  await app.close();
});

test("reabrir: id inexistente dá 404, id inválido dá 400 e banco fora do ar dá 503", async () => {
  const app = await montar(repositorio([linha(1, true)]));
  assert.equal((await app.inject({ method: "GET", url: "/api/analises/99" })).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: "/api/analises/abc" })).statusCode, 400);
  assert.equal(typeof (await app.inject({ method: "GET", url: "/api/analises/99" })).json().erro, "string");
  await app.close();

  const foraDoAr = await montar({
    ...repositorio([]),
    buscarAnalise: async () => {
      throw new Error("connect ECONNREFUSED");
    },
  });
  assert.equal((await foraDoAr.inject({ method: "GET", url: "/api/analises/1" })).statusCode, 503);
  await foraDoAr.close();
});

test("item do histórico traz o código do caso", async () => {
  const app = await montar(repositorio([linha(4, true)]));

  const lista = (await app.inject({ method: "GET", url: "/api/analises" })).json();

  assert.equal(lista.itens[0].codigo, "Caso 0004");
  await app.close();
});

test("demonstração cobre os quatro desfechos do painel", () => {
  const casos = casosDeDemonstracao();

  assert.equal(casos.length, 4);
  assert.ok(casos.every((c) => c.entrada.medicamento.nome.startsWith(PREFIXO_DEMONSTRACAO)));
  assert.equal(casos.filter((c) => c.tema6?.resumo.aptoParaProtocolo).length, 1, "um apto");
  assert.ok(casos.some((c) => c.tema6?.avaliacoes.some((a) => a.status === "falta")), "um com requisito faltando");
  assert.ok(casos.some((c) => c.rota.justica === "federal"), "um federal");
  assert.ok(casos.some((c) => c.rota.justica === "estadual"), "um estadual");
  assert.ok(casos.some((c) => c.tema6 === null), "um só pelo motor");
  // Casos com IA reabrem direto no dossiê: as cinco peças precisam existir.
  for (const c of casos.filter((c) => c.tema6)) {
    const dossie = c.dossie as Record<string, unknown>;
    for (const peca of ["memorandoDeRota", "requerimentoAdministrativo", "resumoDeEvidencia", "pendenciasDoCliente", "trechoDePeticao"]) {
      assert.ok(peca in dossie, `dossiê sem ${peca}`);
    }
  }
});
