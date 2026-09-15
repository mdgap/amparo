import { definirRota, orgaoAdministrativo } from "../../../backend/src/domain/rota.ts";
import { PARAMETROS } from "../../../backend/src/domain/parametros.ts";
import { avaliarConitec, avaliarHipossuficiencia } from "../../../backend/src/domain/formulario.ts";
import { avaliacoesSemRegistroAnvisa, consolidarAvaliacoes, resumirTema6, REQUISITOS_TEMA_6 } from "../../../backend/src/domain/tema6.ts";
import type { Analise, ApresentacaoCmed, EntradaCaso, Passo, PontoDeIA } from "../lib/api.ts";
import type { AnaliseReaberta, ItemHistorico, Metricas } from "../lib/historico.ts";
import { temCpf, type Documentos } from "../lib/caso.ts";
import { AVISO_FICTICIO, CENARIOS, entradaDoCenario, type Cenario } from "./cenarios.ts";
import catalogo from "./catalogo.json" with { type: "json" };

export type Simulacao = "normal" | "falha" | "sem-ia";
let cenarioId = CENARIOS[0]!.id;
let simulacao: Simulacao = "normal";
type Registro = { id: number; cenarioId: string; criadoEm: string; analise: Analise; entrada: EntradaCaso };
let registros: Registro[] | null = null;
const esperar = (ms = 450) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function selecionarCenario(id: string) {
  if (!CENARIOS.some((c) => c.id === id)) throw new Error("Cenário não encontrado.");
  cenarioId = id;
  simulacao = "normal";
}

export function cenarioAtual(): Cenario {
  return CENARIOS.find((c) => c.id === cenarioId)!;
}

export function configurarSimulacao(valor: Simulacao) { simulacao = valor; }

export function reiniciarDemo() {
  registros = null;
  selecionarCenario(CENARIOS[0]!.id);
}

function validar(entrada: EntradaCaso) {
  if (entrada.documentos && temCpf(entrada.documentos as Documentos)) throw new Error("CPF detectado. Use apenas documentos fictícios sem identificação.");
  const m = entrada.medicamento;
  const p = entrada.posologia;
  if (!m.nome.trim() || !Number.isFinite(m.precoApresentacao) || m.precoApresentacao <= 0 || !Number.isInteger(m.unidadesPorApresentacao) || m.unidadesPorApresentacao <= 0 || !Number.isFinite(p.unidadesPorTomada) || p.unidadesPorTomada <= 0 || !Number.isFinite(p.tomadasPorDia) || p.tomadasPorDia <= 0 || !Number.isInteger(p.diasPorAno) || p.diasPorAno < 1 || p.diasPorAno > 366) {
    throw new Error("Confira preço, unidades e posologia. Use valores positivos e de 1 a 366 dias.");
  }
}

export function criarAnalise(c: Cenario, entrada: EntradaCaso): Analise {
  validar(entrada);
  const rota = definirRota(entrada.medicamento, entrada.posologia);
  const semRegistro = entrada.medicamento.registroAnvisa?.possui === false;
  const documentos: Partial<Documentos> = entrada.documentos ?? {};
  const a = apresentacao(c);
  const mesmoMedicamento = [c.medicamento.nome, `${a.produto} (${a.apresentacao})`].includes(entrada.medicamento.nome);
  const mesmos = (campos: (keyof Documentos)[]) => mesmoMedicamento && campos.every((campo) => documentos[campo] === c.documentos[campo]);
  const camposPorRequisito: Record<string, (keyof Documentos)[]> = {
    negativa_administrativa: ["requerimentoAdministrativo"],
    impossibilidade_substituicao: ["laudo", "notaENatJus"],
    medicina_baseada_em_evidencias: ["notaENatJus"],
    imprescindibilidade_laudo: ["laudo"],
  };
  const leitura = c.achados.map((av) => mesmos(camposPorRequisito[av.id]!) ? structuredClone(av) : {
    id: av.id, status: "nao_avaliado" as const, evidencias: [],
    justificativa: "As entradas diferem do cenário preparado. A demonstração não interpreta documentos editados.",
    pendencia: "Restaure o cenário para visualizar a resposta documental preparada.",
  });
  const avaliacoes = consolidarAvaliacoes(semRegistro ? avaliacoesSemRegistroAnvisa() : [
    ...leitura,
    // ponytail: data fixa do exercício; serviço oficial usa a data real.
    avaliarConitec(entrada.conitec ?? { situacao: "nao_informado" }, new Date("2026-09-14T00:00:00Z")),
    avaliarHipossuficiencia(entrada.hipossuficiencia ?? { declaracao: false, comprovanteRenda: false }),
  ]);
  const resumo = resumirTema6(avaliacoes);
  const fontes = semRegistro ? catalogo.fontes.slice(2) : catalogo.fontes.slice(0, 2);
  const pendencias = [...resumo.pendencias];
  if (!semRegistro && !documentos.notaENatJus?.trim()) pendencias.push("No exercício, obter material técnico pertinente ou solicitar consulta ao núcleo competente. A demo não busca evidência real.");
  const porRequisito = avaliacoes.map((av, i) => {
    const titulo = REQUISITOS_TEMA_6[i]!.titulo;
    return `${i + 1}. ${titulo}\nEstado: ${av.status}. ${av.justificativa}\n${av.evidencias.length ? `Trecho do exercício: ${av.evidencias.join("\n")}` : "Sem trecho documental para esta classificação."}${av.pendencia ? `\nProvidência: ${av.pendencia}` : ""}`;
  }).join("\n\n");
  const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const numeros = `Custo anual do exercício: ${moeda(rota.custo.custoAnual)}. Quantidade: ${rota.custo.apresentacoesPorAno} apresentações. Referência: ${rota.custo.emSalariosMinimos.toLocaleString("pt-BR")} salários mínimos. Justiça ${rota.justica === "federal" ? "Federal" : "Estadual"}. Polo passivo: ${rota.poloPassivo.join(" e ")}. ${rota.custeio}.`;
  const situacao = semRegistro
    ? "O checklist do Tema 6 não foi aplicado. O cenário demonstra o encaminhamento implementado para ausência de registro e permanece pendente de revisão."
    : resumo.aptoParaProtocolo
      ? "A resposta preparada localizou os seis requisitos do exercício. Esse resultado não é aprovação jurídica nem autoriza protocolo."
      : `O exercício possui ${6 - resumo.ok} requisito(s) pendente(s). O caso não está pronto para protocolo.`;
  const referencias = fontes.map((f) => `${f.documento}, ${f.ancora}. ${f.url_oficial}`).join("\n");
  const rodape = `\n\nFontes de referência do acervo do projeto (sem nova consulta ou validação):\n${referencias}\n\nTodo conteúdo deve permanecer identificado como demonstração.`;
  return {
    rota,
    tema6: {
      avaliacoes, resumo, fontes,
      alertaENatJus: !semRegistro && c.id === "evidencias" && mesmos(["notaENatJus"]) ? "O material demonstrativo é desfavorável e aponta a alternativa fictícia C. Confira o conflito com o laudo do exercício." : undefined,
      alertaDeNulidade: !semRegistro && !documentos.notaENatJus?.trim() ? "O exercício não contém material técnico. A versão oficial apresenta orientação para conferir a necessidade de consulta ao NAT-Jus." : null,
    },
    dossie: {
      memorandoDeRota: `${AVISO_FICTICIO}\n\nMEMORANDO DO CENÁRIO: ${c.titulo}\n\n${situacao}\n\n${numeros}\n\nMemória de cálculo:\n${rota.custo.memoria.join("\n")}\n\nEncaminhamento calculado pelo motor do projeto:\n${rota.fundamento.join("\n\n")}${rodape}`,
      requerimentoAdministrativo: `${AVISO_FICTICIO}\n\nÀ ${orgaoAdministrativo(rota.poloPassivo)}\n\n[REQUERENTE FICTÍCIO], por seu representante [ADVOGADO], apresenta este modelo de pedido de fornecimento de ${entrada.medicamento.nome}. A apresentação, a quantidade e o custo servem apenas ao exercício.\n\n${numeros}\n\nO modelo prevê a juntada de laudo, receita, histórico terapêutico e documentos financeiros pertinentes. Solicita resposta administrativa motivada, com indicação dos fundamentos e de eventual alternativa disponível.\n\nO cenário selecionado é “${c.titulo}”. Confira o pedido já registrado no exercício antes de repetir uma solicitação.\n\n[LOCAL], [DATA].\n[ASSINATURA FICTÍCIA].${rodape}`,
      resumoDeEvidencia: `${AVISO_FICTICIO}\n\nRESUMO DO EXERCÍCIO\n\n${situacao}\n\n${porRequisito}${rodape}`,
      trechoDePeticao: `${AVISO_FICTICIO}\n\nMODELO DE TRECHO PARA VISUALIZAÇÃO\n\n${situacao}\n\nPara demonstrar o encaminhamento, o motor apresenta os seguintes dados: ${numeros}\n\n${rota.fundamento.join("\n\n")}\n\nA preparação da peça pressupõe conferência profissional do ato administrativo, da documentação e da pertinência das fontes. O exemplo não substitui essa conferência.\n\n${pendencias.length ? `Providências do exercício:\n${pendencias.map((v, i) => `${i + 1}. ${v}`).join("\n")}` : "Nenhuma pendência foi registrada na resposta preparada. O exercício permanece fictício."}${rodape}`,
      pendenciasDoCliente: pendencias,
    },
    anonimizacao: { removidos: {}, total: 0 },
    prompts: {
      simulada: true, modelo: "Nenhum modelo executado", promptVersao: "Snapshot 2026-09-13.2", temperatura: 0, zeroDataRetention: false,
      etapas: catalogo.pontos.filter((p) => p.id === "dossie" || (!semRegistro && p.id === "tema6")).map((p) => ({ id: p.id, titulo: p.titulo, sistema: p.sistema ?? "", usuario: p.template ?? "" })),
    },
    parametrosVersao: PARAMETROS.versao,
  };
}

function historico(): Registro[] {
  registros ??= CENARIOS.map((c, i) => ({ id: i + 1, cenarioId: c.id, criadoEm: `2026-09-${String(14 - i).padStart(2, "0")}T12:00:00Z`, analise: criarAnalise(c, entradaDoCenario(c)), entrada: entradaDoCenario(c) })).reverse();
  return registros;
}

export function cenarioDoHistorico(id: number): Cenario {
  const r = historico().find((r) => r.id === id);
  if (!r) throw new Error("Análise demonstrativa não encontrada.");
  return CENARIOS.find((c) => c.id === r.cenarioId)!;
}

export function entradaDoHistorico(id: number): EntradaCaso {
  const r = historico().find((r) => r.id === id);
  if (!r) throw new Error("Análise demonstrativa não encontrada.");
  return structuredClone(r.entrada);
}

function gravar(analise: Analise, idCenario: string, entrada: EntradaCaso) {
  const lista = historico();
  lista.unshift({ id: (lista[0]?.id ?? 0) + 1, cenarioId: idCenario, criadoEm: new Date().toISOString(), analise: structuredClone(analise), entrada: structuredClone(entrada) });
}

function apresentacao(c: Cenario): ApresentacaoCmed {
  return {
    id: CENARIOS.indexOf(c) + 1, principio_ativo: c.medicamento.principioAtivo!, produto: c.medicamento.nome,
    apresentacao: "50 mg, caixa com 30 unidades (apresentação fictícia)", laboratorio: "Fabricante fictício",
    pmvg_0: String(c.medicamento.precoApresentacao), unidades_por_apresentacao: 30, tabela_versao: "DEMO • valores fictícios",
  };
}

const normalizar = (v: string) => v.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
function buscarCenarios(q: string) {
  if (q.trim().length < 3) throw new Error("Informe ao menos 3 caracteres.");
  return CENARIOS.filter((c) => normalizar(c.medicamento.nome).includes(normalizar(q.trim())));
}

export const demoApi = {
  requisitos: async () => { await esperar(200); return { requisitos: REQUISITOS_TEMA_6, parametros: PARAMETROS, iaDisponivel: false }; },
  pontosDeIA: async () => {
    await esperar(200);
    return { iaDisponivel: false, pontos: catalogo.pontos as PontoDeIA[] };
  },
  analisar: async (entrada: EntradaCaso) => demoApi.analisarComProgresso(entrada, () => {}),
  analisarComProgresso: async (entrada: EntradaCaso, aoAndar: (passo: Passo) => void): Promise<Analise> => {
    validar(entrada);
    const c = cenarioAtual();
    const modo = simulacao;
    if (modo === "falha") simulacao = "normal";
    for (const [id, ms, detalhe] of [
      ["anonimizacao", 800, "Etapa simulada. Nenhum documento foi enviado ou anonimizado por serviço."],
      ["motor", 800, "Cálculo local usando as regras do projeto."],
      ["tema6", 4200, "Resposta documental preparada para o cenário. Nenhum modelo executado."],
      ["placar", 700, "Resumo calculado localmente."],
      ["dossie", 3000, "Minutas demonstrativas montadas localmente."],
    ] as const) {
      aoAndar({ id, estado: "fazendo" });
      await esperar(modo === "sem-ia" ? 300 : ms);
      if (modo === "falha" && id === "tema6") throw new Error("Falha simulada na análise. Os campos foram preservados. Tente novamente para concluir o exercício.");
      aoAndar({ id, estado: "feito", detalhe: modo === "sem-ia" && (id === "tema6" || id === "dossie") ? "Etapa não executada: simulação de IA indisponível." : detalhe });
    }
    const a = modo === "sem-ia" ? {
      rota: definirRota(entrada.medicamento, entrada.posologia), tema6: null, dossie: null,
      aviso: "Indisponibilidade simulada. Apenas o cálculo local foi executado; restaure o modo normal para ver a leitura preparada e o dossiê.",
      parametrosVersao: PARAMETROS.versao,
    } : criarAnalise(c, entrada);
    gravar(a, c.id, entrada);
    return a;
  },
  cmed: async (q: string) => { await esperar(); return buscarCenarios(q).map(apresentacao); },
  reconhecer: async (_laudo: string, _receita: string) => {
    await esperar(900);
    const c = cenarioAtual();
    return {
      achados: [{ principioAtivo: c.medicamento.principioAtivo!, termoEncontrado: c.medicamento.principioAtivo!, papel: "pedido" as const }],
      apresentacoes: [apresentacao(c)],
      posologia: { unidadesPorTomada: c.medicamento.unidadesPorTomada, tomadasPorDia: c.medicamento.tomadasPorDia, diasPorAno: c.medicamento.diasPorAno, evidencias: ["Resposta preparada do cenário; os textos enviados não foram interpretados."] },
    };
  },
  documento: async (_arquivo: File, campo: keyof Documentos = "laudo") => {
    await esperar(1100);
    return { origem: "texto-do-pdf" as const, texto: cenarioAtual().documentos[campo], paginas: 1, precisaConferencia: false };
  },
  natjus: async (q: string) => {
    await esperar(700);
    const notas = buscarCenarios(q).filter((c) => c.documentos.notaENatJus).map((c) => ({
      id: CENARIOS.indexOf(c) + 1, cid: `${c.titulo} • documento demonstrativo`, uf: "DEMO", finalizadaEm: "14/09/2026",
      url: `data:text/plain;charset=utf-8,${encodeURIComponent(c.documentos.notaENatJus)}`,
    }));
    return { notas, total: notas.length, paginas: notas.length ? 1 : 0 };
  },
  notaNatjus: async (id: number) => {
    await esperar(900);
    const c = CENARIOS[id - 1];
    if (!c?.documentos.notaENatJus) throw new Error("Material demonstrativo não encontrado.");
    return { texto: c.documentos.notaENatJus, removidos: {} as Record<string, number> };
  },
  conitec: async (q: string) => {
    await esperar(650);
    return {
      registros: buscarCenarios(q).map((c) => ({ tecnologia: c.medicamento.principioAtivo!, indicacao: "Indicação fictícia do exercício", status: "Registro demonstrativo, sem consulta ao portal", data_protocolo: c.processuais.conitec.situacao === "em_analise" ? c.processuais.conitec.desde : null, data_decisao: c.processuais.conitec.situacao === "desfavoravel" ? c.processuais.conitec.desde : null, tabela_versao: "DEMO", situacaoSugerida: c.processuais.conitec.situacao })),
      // Base de exemplos incompleta: ausência não afirma que nunca houve avaliação.
      nuncaDemandado: false, painelVersao: "DEMO • registros fictícios",
    };
  },
};

function item(r: Registro): ItemHistorico {
  const a = r.analise;
  return { id: r.id, codigo: `Demo ${String(r.id).padStart(4, "0")}`, criadoEm: r.criadoEm, medicamento: r.entrada.medicamento.nome, custoAnual: a.rota.custo.custoAnual, emSalariosMinimos: a.rota.custo.emSalariosMinimos, justica: a.rota.justica, faixa: a.rota.faixa, placar: a.tema6 ? { ok: a.tema6.resumo.ok, total: 6 } : null, aptoParaProtocolo: a.tema6?.resumo.aptoParaProtocolo ?? null, comIA: false };
}

export const demoHistorico = {
  historico: async ({ limite, antesDe }: { limite: number; antesDe?: number }) => {
    await esperar(250);
    const lista = historico().filter((r) => antesDe === undefined || r.id < antesDe);
    const itens = lista.slice(0, limite).map(item);
    return { itens, proximo: lista.length > limite ? itens.at(-1)!.id : null };
  },
  analise: async (id: number): Promise<AnaliseReaberta> => {
    await esperar(700);
    const r = historico().find((r) => r.id === id);
    if (!r) throw new Error("Análise demonstrativa não encontrada.");
    return { ...structuredClone(r.analise), id, codigo: `Demo ${String(id).padStart(4, "0")}`, criadoEm: r.criadoEm, reaberta: true };
  },
  metricas: async (): Promise<Metricas> => {
    await esperar(250);
    const lista = historico();
    const analisadas = lista.filter((r) => r.analise.tema6 !== null);
    const custos = lista.map((r) => r.analise.rota.custo.custoAnual).sort((a, b) => a - b);
    const meio = Math.floor(custos.length / 2);
    const contagem = new Map<string, number>();
    for (const r of analisadas) for (const av of r.analise.tema6!.avaliacoes) if (av.status !== "ok") contagem.set(av.id, (contagem.get(av.id) ?? 0) + 1);
    const maior = [...contagem].sort((a, b) => b[1] - a[1])[0];
    return {
      total: lista.length, analisesComIA: 0,
      porJustica: { federal: lista.filter((r) => r.analise.rota.justica === "federal").length, estadual: lista.filter((r) => r.analise.rota.justica === "estadual").length },
      percentualApto: analisadas.length ? Math.round(analisadas.filter((r) => r.analise.tema6!.resumo.aptoParaProtocolo).length / analisadas.length * 1000) / 10 : null,
      requisitoQueMaisReprova: maior ? { id: maior[0], vezes: maior[1] } : null,
      custoAnualMediano: custos.length % 2 ? custos[meio]! : (custos[meio - 1]! + custos[meio]!) / 2,
    };
  },
};
