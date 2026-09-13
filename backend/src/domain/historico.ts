/**
 * Histórico de análises: o que vai para o banco e como a lista e as métricas
 * são montadas a partir dele.
 *
 * O registro é montado campo a campo, nunca por espalhamento: o que não está
 * listado aqui não chega ao banco. Texto de documento e o que o modelo cita do
 * laudo (evidências, justificativas, pendências) ficam fora — invariante 4.
 */
import type { ResumoTema6 } from "./tema6.ts";
import type {
  AvaliacaoRequisito,
  FaixaCusto,
  Justica,
  Medicamento,
  Posologia,
  ResultadoRota,
  StatusRequisito,
} from "./types.ts";

export interface EntradaPersistida {
  medicamento: Pick<
    Medicamento,
    | "nome"
    | "principioAtivo"
    | "apresentacao"
    | "precoApresentacao"
    | "precoOrigem"
    | "unidadesPorApresentacao"
    | "incorporadoSus"
  > & { registroAnvisa?: { possui: boolean } };
  posologia: Posologia;
}

export interface Tema6Persistido {
  avaliacoes: { id: string; status: StatusRequisito }[];
  resumo: Omit<ResumoTema6, "pendencias">;
}

export interface RegistroAnalise {
  entrada: EntradaPersistida;
  rota: ResultadoRota;
  tema6: Tema6Persistido | null;
  /** Minutas geradas pela IA — guardadas para a análise poder ser reaberta. */
  dossie: unknown;
}

export interface LinhaAnalise extends RegistroAnalise {
  /** O pg devolve BIGSERIAL como string. */
  id: string | number;
  criado_em: Date | string;
  parametros_versao?: string;
}

export interface ItemHistorico {
  id: number;
  codigo: string;
  criadoEm: string;
  medicamento: string;
  custoAnual: number;
  emSalariosMinimos: number;
  justica: Justica;
  faixa: FaixaCusto;
  placar: { ok: number; total: number } | null;
  aptoParaProtocolo: boolean | null;
  /** false quando só o motor rodou (sem chave de IA). */
  comIA: boolean;
}

/** A análise salva no formato que a tela de achados e o dossiê já sabem ler. */
export interface AnaliseReaberta {
  id: number;
  codigo: string;
  criadoEm: string;
  reaberta: true;
  entrada: EntradaPersistida;
  rota: ResultadoRota;
  tema6: {
    avaliacoes: (Pick<AvaliacaoRequisito, "id" | "status" | "justificativa" | "evidencias">)[];
    resumo: ResumoTema6;
    fontes: never[];
  } | null;
  dossie: unknown;
  aviso?: string;
  parametrosVersao: string;
}

export interface Metricas {
  total: number;
  porJustica: Record<Justica, number>;
  analisesComIA: number;
  /** % das análises com IA aptas para protocolo; null sem nenhuma análise com IA. */
  percentualApto: number | null;
  /** Requisito com mais status diferente de "ok" — não avaliado conta (invariante 3). */
  requisitoQueMaisReprova: { id: string; vezes: number } | null;
  custoAnualMediano: number | null;
}

export function montarRegistro({
  medicamento,
  posologia,
  rota,
  tema6,
  dossie,
}: {
  medicamento: Medicamento;
  posologia: Posologia;
  rota: ResultadoRota;
  tema6: { avaliacoes: AvaliacaoRequisito[]; resumo: ResumoTema6; alertaENatJus?: string; fontes: unknown[] } | null;
  dossie: unknown;
}): RegistroAnalise {
  return {
    entrada: {
      medicamento: {
        nome: medicamento.nome,
        principioAtivo: medicamento.principioAtivo,
        apresentacao: medicamento.apresentacao,
        precoApresentacao: medicamento.precoApresentacao,
        // Preço de orçamento é referência provisória: o histórico precisa saber.
        precoOrigem: medicamento.precoOrigem,
        unidadesPorApresentacao: medicamento.unidadesPorApresentacao,
        registroAnvisa: medicamento.registroAnvisa && { possui: medicamento.registroAnvisa.possui },
        incorporadoSus: medicamento.incorporadoSus,
      },
      posologia: {
        unidadesPorTomada: posologia.unidadesPorTomada,
        tomadasPorDia: posologia.tomadasPorDia,
        diasPorAno: posologia.diasPorAno,
      },
    },
    rota,
    tema6: tema6 && {
      avaliacoes: tema6.avaliacoes.map(({ id, status }) => ({ id, status })),
      resumo: {
        total: tema6.resumo.total,
        ok: tema6.resumo.ok,
        fracos: tema6.resumo.fracos,
        faltantes: tema6.resumo.faltantes,
        naoAvaliados: tema6.resumo.naoAvaliados,
        prontidao: tema6.resumo.prontidao,
        aptoParaProtocolo: tema6.resumo.aptoParaProtocolo,
      },
    },
    dossie: semPrompt(dossie),
  };
}

/** O prompt do dossiê carrega o texto do documento: vai na resposta, não no banco. */
function semPrompt(dossie: unknown): unknown {
  if (!dossie || typeof dossie !== "object") return dossie;
  const resto = { ...(dossie as Record<string, unknown>) };
  delete resto.prompt;
  return resto;
}

/**
 * Código curto do caso, gerado do id. É o que o advogado usa para reconhecer
 * o caso no painel: não existe campo livre de apelido, que seria o lugar mais
 * fácil de alguém digitar o nome do paciente.
 */
export function codigoDoCaso(id: number | string): string {
  return `Caso ${String(Number(id)).padStart(4, "0")}`;
}

export function resumirParaHistorico(linha: LinhaAnalise): ItemHistorico {
  const { tema6 } = linha;
  return {
    id: Number(linha.id),
    codigo: codigoDoCaso(linha.id),
    criadoEm: new Date(linha.criado_em).toISOString(),
    medicamento: linha.entrada.medicamento.nome,
    custoAnual: linha.rota.custo.custoAnual,
    emSalariosMinimos: linha.rota.custo.emSalariosMinimos,
    justica: linha.rota.justica,
    faixa: linha.rota.faixa,
    placar: tema6 ? { ok: tema6.resumo.ok, total: tema6.resumo.total } : null,
    aptoParaProtocolo: tema6 ? tema6.resumo.aptoParaProtocolo : null,
    comIA: tema6 !== null,
  };
}

export function reabrirAnalise(linha: LinhaAnalise): AnaliseReaberta {
  const { tema6 } = linha;
  return {
    id: Number(linha.id),
    codigo: codigoDoCaso(linha.id),
    criadoEm: new Date(linha.criado_em).toISOString(),
    reaberta: true,
    entrada: linha.entrada,
    rota: linha.rota,
    // Evidência e justificativa não são guardadas: a tela recebe vazio, não inventado.
    tema6: tema6 && {
      avaliacoes: tema6.avaliacoes.map(({ id, status }) => ({ id, status, justificativa: "", evidencias: [] })),
      resumo: { ...tema6.resumo, pendencias: [] },
      fontes: [],
    },
    dossie: linha.dossie ?? null,
    aviso: tema6 ? undefined : "Análise feita só pelo motor de regras, sem a leitura dos documentos pela IA.",
    parametrosVersao: linha.parametros_versao ?? "",
  };
}

export function calcularMetricas(linhas: LinhaAnalise[]): Metricas {
  const porJustica: Record<Justica, number> = { federal: 0, estadual: 0 };
  const pendenciasPorRequisito = new Map<string, number>();
  let analisesComIA = 0;
  let aptas = 0;

  for (const { rota, tema6 } of linhas) {
    if (rota.justica in porJustica) porJustica[rota.justica] += 1;
    if (!tema6) continue;
    analisesComIA += 1;
    if (tema6.resumo.aptoParaProtocolo) aptas += 1;
    for (const { id, status } of tema6.avaliacoes) {
      if (status !== "ok") pendenciasPorRequisito.set(id, (pendenciasPorRequisito.get(id) ?? 0) + 1);
    }
  }

  let requisitoQueMaisReprova: Metricas["requisitoQueMaisReprova"] = null;
  for (const [id, vezes] of pendenciasPorRequisito) {
    if (!requisitoQueMaisReprova || vezes > requisitoQueMaisReprova.vezes) {
      requisitoQueMaisReprova = { id, vezes };
    }
  }

  return {
    total: linhas.length,
    porJustica,
    analisesComIA,
    percentualApto: analisesComIA ? Math.round((aptas / analisesComIA) * 1000) / 10 : null,
    requisitoQueMaisReprova,
    custoAnualMediano: mediana(linhas.map((l) => l.rota.custo.custoAnual)),
  };
}

function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const valor = ordenados.length % 2 ? ordenados[meio]! : (ordenados[meio - 1]! + ordenados[meio]!) / 2;
  return Math.round(valor * 100) / 100;
}
