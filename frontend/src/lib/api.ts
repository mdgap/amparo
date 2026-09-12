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

export type PassoId = "anonimizacao" | "motor" | "tema6" | "placar" | "dossie";

export interface Passo {
  id: PassoId;
  estado: "fazendo" | "feito";
  detalhe?: string;
}

/** Os passos na ordem, com o que cada um faz — a tela lê daqui. */
export const PASSOS_DA_ANALISE: { id: PassoId; titulo: string; enquanto: string }[] = [
  {
    id: "anonimizacao",
    titulo: "Anonimizando os documentos",
    enquanto: "Nome, CPF, cartão do SUS, endereço e contato viram marcador antes de qualquer coisa. Roda no nosso servidor: o texto identificado não sai daqui.",
  },
  {
    id: "motor",
    titulo: "Calculando custo, foro e polo passivo",
    enquanto: "Conta determinística a partir do preço e da posologia. Nenhum desses números passa pelo modelo.",
  },
  {
    id: "tema6",
    titulo: "Lendo os documentos e classificando os seis requisitos",
    enquanto: "Busca os fundamentos no corpus normativo e confronta cada requisito do Tema 6 com o que os documentos provam. É a etapa mais longa.",
  },
  {
    id: "placar",
    titulo: "Consolidando o placar",
    enquanto: "Quantos requisitos estão ok, fracos ou faltando — somado em código, não pelo modelo.",
  },
  {
    id: "dossie",
    titulo: "Redigindo as cinco peças do dossiê",
    enquanto: "Memorando de rota, requerimento administrativo, resumo de evidência, pendências e trecho de petição.",
  },
];

export const api = {
  analisar: (entrada: EntradaCaso) => post<Analise>("/analise", entrada),

  /**
   * Mesma análise, recebendo o progresso enquanto acontece. Usa fetch com
   * leitura incremental, e não EventSource, porque o caso vai no corpo do POST.
   */
  analisarComProgresso: async (
    entrada: EntradaCaso,
    aoAndar: (passo: Passo) => void,
  ): Promise<Analise> => {
    const resp = await fetch("/api/analise/progresso", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entrada),
    });

    if (!resp.ok || !resp.body) {
      const erro = await resp.json().catch(() => null);
      throw new Error(erro?.erro ?? `Falha na análise (${resp.status})`);
    }

    const leitor = resp.body.getReader();
    const decodificador = new TextDecoder();
    let resto = "";
    let resultado: Analise | null = null;

    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      resto += decodificador.decode(value, { stream: true });

      // Eventos chegam separados por linha em branco; o último pedaço pode
      // estar incompleto e fica para a próxima volta.
      const blocos = resto.split("\n\n");
      resto = blocos.pop() ?? "";
      for (const bloco of blocos) {
        const linha = bloco.split("\n").find((l) => l.startsWith("data: "));
        if (!linha) continue;
        const evento = JSON.parse(linha.slice(6));
        if (evento.tipo === "passo") aoAndar(evento as Passo);
        else if (evento.tipo === "fim") resultado = evento.resultado as Analise;
        else if (evento.tipo === "erro") throw new Error(evento.erro);
      }
    }

    if (!resultado) throw new Error("A análise terminou sem devolver resultado.");
    return resultado;
  },
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
  /** Notas técnicas do e-NatJus para um princípio ativo (consulta pública do CNJ). */
  natjus: async (q: string) => {
    const r = await fetch(`/api/natjus?q=${encodeURIComponent(q)}`);
    const json = await r.json();
    if (!r.ok) throw new Error(json.erro ?? "Falha ao consultar o e-NatJus");
    return json as {
      notas: { id: number; cid: string; uf: string; finalizadaEm: string; url: string }[];
      total: number;
      paginas: number;
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
