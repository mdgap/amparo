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
    "nome" | "principioAtivo" | "apresentacao" | "precoApresentacao" | "unidadesPorApresentacao" | "incorporadoSus"
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
}

export interface ItemHistorico {
  id: number;
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
    dossie,
  };
}

export function resumirParaHistorico(linha: LinhaAnalise): ItemHistorico {
  const { tema6 } = linha;
  return {
    id: Number(linha.id),
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
