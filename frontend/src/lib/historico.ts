import type { Analise, ResultadoRota } from "./api.ts";

/** Erro da API com o status HTTP, para a tela distinguir banco fora do ar de falha comum. */
export class ErroApi extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

async function lerJson<T>(caminho: string): Promise<T> {
  const resp = await fetch(`/api${caminho}`);
  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new ErroApi(json?.erro ?? `Falha na requisição (${resp.status})`, resp.status);
  return json as T;
}

/** Uma linha do histórico. Nada aqui identifica paciente. */
export interface ItemHistorico {
  id: number;
  /** Gerado do id — não existe campo livre de apelido. */
  codigo: string;
  criadoEm: string;
  medicamento: string;
  custoAnual: number;
  emSalariosMinimos: number;
  justica: "estadual" | "federal";
  faixa: ResultadoRota["faixa"];
  placar: { ok: number; total: number } | null;
  aptoParaProtocolo: boolean | null;
  comIA: boolean;
}

export interface Metricas {
  total: number;
  porJustica: { federal: number; estadual: number };
  analisesComIA: number;
  percentualApto: number | null;
  requisitoQueMaisReprova: { id: string; vezes: number } | null;
  custoAnualMediano: number | null;
}

/**
 * Análise reaberta do histórico. Documentos, evidências e justificativas não
 * são guardados — chegam vazios, e a tela avisa.
 */
export type AnaliseReaberta = Analise & {
  id: number;
  codigo: string;
  criadoEm: string;
  reaberta: true;
};

export const historicoApi = {
  metricas: () => lerJson<Metricas>("/metricas"),

  historico: ({ limite, antesDe }: { limite: number; antesDe?: number }) =>
    lerJson<{ itens: ItemHistorico[]; proximo: number | null }>(
      `/analises?limite=${limite}${antesDe ? `&antesDe=${antesDe}` : ""}`,
    ),

  analise: (id: number) => lerJson<AnaliseReaberta>(`/analises/${id}`),
};
