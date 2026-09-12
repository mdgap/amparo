export interface ResultadoCusto {
  unidadesPorAno: number;
  apresentacoesPorAno: number;
  custoAnual: number;
  custoMensalMedio: number;
  precoUnitario: number;
  emSalariosMinimos: number;
  salarioMinimoUsado: number;
  tetoEmReais: number;
  memoria: string[];
}

export interface ResultadoRota {
  justica: "estadual" | "federal";
  poloPassivo: string[];
  fundamento: string[];
  zonaDeAtencao: boolean;
  custo: ResultadoCusto;
}

export type StatusRequisito = "ok" | "fraco" | "falta" | "nao_avaliado";

export interface AvaliacaoRequisito {
  id: string;
  status: StatusRequisito;
  justificativa: string;
  evidencias: string[];
  pendencia?: string;
}

export interface RequisitoTema6 {
  id: string;
  titulo: string;
  descricao: string;
  fonte: string;
  comoComprovar: string;
}

export interface Fonte {
  trecho_id: number;
  conteudo: string;
  ancora: string | null;
  documento: string;
  tipo: string;
  url_oficial: string | null;
}

export interface Dossie {
  memorandoDeRota: string;
  requerimentoAdministrativo: string;
  resumoDeEvidencia: string;
  pendenciasDoCliente: string[];
  trechoDePeticao: string;
}

export interface Analise {
  rota: ResultadoRota;
  tema6: {
    avaliacoes: AvaliacaoRequisito[];
    resumo: {
      total: number; ok: number; fracos: number; faltantes: number;
      naoAvaliados: number; prontidao: number; aptoParaProtocolo: boolean;
      pendencias: string[];
    };
    alertaENatJus?: string;
    fontes: Fonte[];
  } | null;
  dossie: Dossie | null;
  aviso?: string;
  parametrosVersao: string;
}

export interface EntradaCaso {
  medicamento: {
    nome: string;
    precoApresentacao: number;
    unidadesPorApresentacao: number;
    registroAnvisa?: { possui: boolean };
  };
  posologia: {
    unidadesPorTomada: number;
    tomadasPorDia: number;
    diasPorAno: number;
  };
  documentos?: {
    laudo: string;
    receita?: string;
    notaENatJus?: string;
    requerimentoAdministrativo?: string;
  };
  apenasRota?: boolean;
}

async function post<T>(caminho: string, corpo: unknown): Promise<T> {
  const resp = await fetch(`/api${caminho}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro ?? "Falha na requisição");
  return json as T;
}

export const api = {
  analisar: (entrada: EntradaCaso) => post<Analise>("/analise", entrada),
  requisitos: async () => {
    const r = await fetch("/api/requisitos");
    return (await r.json()) as {
      requisitos: RequisitoTema6[];
      parametros: { versao: string; salarioMinimo: { valorMensal: number } };
      iaDisponivel: boolean;
    };
  },
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
