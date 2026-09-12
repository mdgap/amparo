/**
 * Busca de notas técnicas na consulta pública do e-NatJus (CNJ).
 *
 * O Tema 1234 e o Guia do CNJ dizem que a consulta ao NAT-Jus é obrigatória
 * para medicamento não incorporado, e que a decisão não pode se apoiar só no
 * laudo do autor. Era a única peça do fluxo que dependia de o advogado ir
 * buscar à mão.
 *
 * ATENÇÃO: não é API documentada. É o endpoint que a própria página pública de
 * pesquisa usa — sem autenticação, mas sem contrato. Pode mudar sem aviso, e
 * por isso toda falha aqui é degradação, nunca erro fatal: sem nota, o produto
 * continua funcionando como antes.
 */
const BASE = "https://www.pje.jus.br/e-natjus";
const PAGINA_DE_PESQUISA = `${BASE}/pesquisaPublica.php`;
const API_LISTAR = `${BASE}/api/pesquisaPublica/listar`;

/** Medicamento, na classificação do próprio sistema. */
const TIPO_MEDICAMENTO = "1";
/** O token traz timestamp; renovar antes de expirar sai mais barato que errar. */
const VALIDADE_DO_TOKEN_MS = 5 * 60 * 1000;
const TEMPO_LIMITE_MS = 15_000;

export interface NotaTecnica {
  id: number;
  /** CID que motivou a nota — é o que aproxima ou afasta do caso. */
  cid: string;
  /** NatJus responsável: "Nacional" ou a sigla do estado. */
  uf: string;
  finalizadaEm: string;
  /** Página pública da nota, para o advogado abrir e conferir. */
  url: string;
}

export interface ResultadoNatJus {
  notas: NotaTecnica[];
  total: number;
  paginas: number;
}

let cache: { token: string; em: number } | null = null;

/** O token vem no HTML da página de pesquisa e vale por alguns minutos. */
async function obterToken(): Promise<string> {
  if (cache && Date.now() - cache.em < VALIDADE_DO_TOKEN_MS) return cache.token;

  const html = await buscar(PAGINA_DE_PESQUISA);
  const m = /id="token"[^>]*value="([^"]+)"/.exec(html) ?? /name="token"[^>]*value="([^"]+)"/.exec(html);
  if (!m) throw new Error("não achei o token na página de pesquisa do e-NatJus");

  cache = { token: m[1]!, em: Date.now() };
  return cache.token;
}

async function buscar(url: string, init?: RequestInit): Promise<string> {
  const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  if (!resp.ok) throw new Error(`e-NatJus respondeu ${resp.status}`);
  return resp.text();
}

export interface ConsultaNatJus {
  principioAtivo: string;
  /** Código ou trecho do CID, para aproximar do quadro do paciente. */
  cid?: string;
  /** "favoravel" reduz a lista ao que sustenta o pedido. */
  conclusao?: "favoravel" | "nao_favoravel";
  pagina?: number;
}

export async function buscarNotas(consulta: ConsultaNatJus): Promise<ResultadoNatJus> {
  const parametros = new URLSearchParams({
    token: await obterToken(),
    selTipoTecnologia: TIPO_MEDICAMENTO,
    // O campo aceita texto livre, apesar de ser um select na interface.
    txtDcb: consulta.principioAtivo,
    pagina: String(consulta.pagina ?? 1),
  });
  if (consulta.cid) parametros.set("txtCid", consulta.cid);
  if (consulta.conclusao) {
    parametros.set("selConclusao", consulta.conclusao === "favoravel" ? "1" : "2");
  }

  const bruto = await buscar(`${API_LISTAR}?${parametros}`, { method: "POST" });

  let json: {
    data?: { idNotaTecnica: number; cid: string; natResponsavel: string; horaFinalizado: string }[];
    recordsTotal?: number;
    paginasTotal?: number;
  };
  try {
    json = JSON.parse(bruto);
  } catch {
    throw new Error("e-NatJus devolveu resposta inesperada (a consulta pública pode ter mudado)");
  }

  return {
    notas: (json.data ?? []).map((n) => ({
      id: n.idNotaTecnica,
      cid: n.cid,
      uf: n.natResponsavel,
      finalizadaEm: n.horaFinalizado,
      url: `${BASE}/notaTecnica-dados.php?idNotaTecnica=${n.idNotaTecnica}`,
    })),
    total: json.recordsTotal ?? 0,
    paginas: json.paginasTotal ?? 0,
  };
}
