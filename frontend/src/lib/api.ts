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
  faixa: "sem_registro_anvisa" | "abaixo_do_piso" | "ressarcimento_federal" | "acima_do_teto";
  custeio: string;
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

export interface Anonimizacao {
  removidos: Record<string, number>;
  total: number;
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
  /** Placar da anonimização feita antes de o texto ir ao modelo. */
  anonimizacao?: Anonimizacao;
  aviso?: string;
  parametrosVersao: string;
}

export interface EntradaCaso {
  medicamento: {
    nome: string;
    precoApresentacao: number;
    precoOrigem?: "cmed" | "orcamento";
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

/** Uma apresentação da lista de preços da CMED. */
export interface ApresentacaoCmed {
  id: number;
  principio_ativo: string;
  produto: string;
  apresentacao: string;
  laboratorio: string | null;
  pmvg_0: string | null;
  unidades_por_apresentacao: number | null;
  tabela_versao: string;
}

export const api = {
  analisar: (entrada: EntradaCaso) => post<Analise>("/analise", entrada),
  reconhecer: async (laudo: string, receita: string) =>
    post<{
      achados: {
        principioAtivo: string;
        termoEncontrado: string;
        papel: "pedido" | "ja_tentado" | "indefinido";
      }[];
      apresentacoes: ApresentacaoCmed[];
      posologia: {
        unidadesPorTomada?: number;
        tomadasPorDia?: number;
        diasPorAno?: number;
        evidencias: string[];
      };
    }>("/reconhecer", { laudo, receita }),
  documento: async (arquivo: File) => {
    const form = new FormData();
    form.append("arquivo", arquivo);
    const r = await fetch("/api/documento", { method: "POST", body: form });
    // Nem toda resposta é JSON: o nginx recusa arquivo grande com HTML.
    const bruto = await r.text();
    let json: { erro?: string; [k: string]: unknown };
    try {
      json = JSON.parse(bruto);
    } catch {
      throw new Error(
        `O servidor respondeu ${r.status} sem detalhe. ` +
          (r.status === 413 ? "O arquivo é grande demais." : "Verifique se a API está no ar."),
      );
    }
    if (!r.ok) throw new Error(json.erro ?? `Falha ao ler o documento (${r.status})`);
    return json as {
      origem: "texto-do-pdf" | "ocr";
      texto: string;
      paginas: number;
      confianca?: number;
      precisaConferencia: boolean;
    };
  },
  cmed: async (q: string) => {
    const r = await fetch(`/api/cmed?q=${encodeURIComponent(q)}`);
    const json = await r.json();
    if (!r.ok) throw new Error(json.erro ?? "Falha na busca da CMED");
    return json as ApresentacaoCmed[];
  },
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
