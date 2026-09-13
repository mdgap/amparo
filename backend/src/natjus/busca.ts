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

/**
 * Conteúdo de uma nota técnica, lido da página pública.
 *
 * A página é um formulário só-leitura: os campos estruturados (conclusão,
 * evidência científica, situação na CONITEC) vêm sempre preenchidos e são o que
 * mais serve aos requisitos (c) e (d) do Tema 6. Os campos de texto livre
 * costumam trazer só "-" ou ".", porque o conteúdo real vai no PDF anexo —
 * por isso `anexo` existe: é o caminho honesto para o advogado ler o resto.
 */
export interface ConteudoDaNota {
  id: number;
  principioAtivo: string;
  cid: string;
  /** "Favorável" ou "Não favorável" — alimenta o requisito (d). */
  conclusao: string;
  /** Se a nota se apoia em evidência científica. */
  evidenciaCientifica: string;
  situacaoConitec: string;
  disponivelNoSus: string;
  previstoEmProtocolo: string;
  registroAnvisa: string;
  /** Alternativas do SUS descritas pela nota — o confronto do requisito (c). */
  opcoesNoSus: string;
  textoDaConclusao: string;
  referencias: string;
  natJus: string;
  /** Nome do PDF anexo, quando o conteúdo não está nos campos de texto. */
  anexo: string;
  /** Hash do anexo na consulta pública, para baixar o PDF. */
  anexoHash: string;
  /** Texto do PDF anexo, quando pedido e legível. */
  textoDoAnexo?: string;
  url: string;
}

/** Tira as tags do editor de texto usado pelo formulário. */
function semHtml(bruto: string): string {
  // Entidades ANTES das tags: o conteúdo do textarea vem escapado
  // ("&lt;p&gt;"), e tirar tags primeiro deixaria o <p> visível no texto.
  const texto = bruto
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Nota sem conteúdo costuma vir com um traço ou ponto solto no lugar.
  return /^[-.\s]*$/.test(texto) ? "" : texto;
}

function valorDeInput(html: string, id: string): string {
  const m = new RegExp(`<input[^>]*\\bid="${id}"[^>]*>`, "i").exec(html);
  if (!m) return "";
  const v = /\bvalue="([^"]*)"/i.exec(m[0]);
  return semHtml(v?.[1] ?? "");
}

function valorDeTextarea(html: string, id: string): string {
  const m = new RegExp(`<textarea[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</textarea>`, "i").exec(html);
  return semHtml(m?.[1] ?? "");
}

/**
 * Valor de um select só-leitura. A página marca a escolha de duas formas: com
 * `selected`, ou deixando uma única `<option>` no lugar da lista inteira — é
 * assim que vêm o princípio ativo e o CID.
 */
function valorDeSelect(html: string, id: string): string {
  const bloco = new RegExp(`<select[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</select>`, "i").exec(html);
  if (!bloco) return "";

  const opcoes = [...bloco[1]!.matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/gi)];
  const marcada = opcoes.find((o) => /\bselected\b/i.test(o[1]!));
  const unica = opcoes.length === 1 ? opcoes[0] : undefined;

  const texto = semHtml((marcada ?? unica)?.[2] ?? "");
  return texto === "Selecione" || texto === "Selecione um item" ? "" : texto;
}

/**
 * Baixa o PDF do anexo. Medido numa amostra de 12 notas: a conclusão vem
 * preenchida em 12, e os campos de texto em NENHUMA — o conteúdo está sempre
 * no anexo. Sem baixá-lo, o confronto do requisito (c) fica sem material.
 */
export async function baixarAnexo(hash: string): Promise<Uint8Array> {
  const resp = await fetch(`${BASE}/arquivo-download.php?hash=${hash}`, {
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!resp.ok) throw new Error(`download do anexo respondeu ${resp.status}`);
  const dados = new Uint8Array(await resp.arrayBuffer());
  if (dados.byteLength > 20 * 1024 * 1024) throw new Error("anexo maior que 20 MB");
  return dados;
}

export async function lerNota(id: number): Promise<ConteudoDaNota> {
  const url = `${BASE}/notaTecnica-dados.php?idNotaTecnica=${id}`;
  const html = await buscar(url);

  const nota: ConteudoDaNota = {
    id,
    principioAtivo: valorDeSelect(html, "txtDcb") || valorDeInput(html, "txtDcbComercial"),
    cid: valorDeSelect(html, "txtCid"),
    conclusao: valorDeSelect(html, "selConclusao"),
    evidenciaCientifica: valorDeSelect(html, "selEvidenciaCientifica"),
    situacaoConitec: valorDeSelect(html, "selRecomendacaoConitec"),
    disponivelNoSus: valorDeSelect(html, "selDisponivelSus"),
    previstoEmProtocolo: valorDeSelect(html, "selPrevistoProtocolo"),
    registroAnvisa: valorDeSelect(html, "selRegistroAnvisa"),
    opcoesNoSus: valorDeTextarea(html, "txaOpcaoSus"),
    textoDaConclusao: valorDeTextarea(html, "txaConclusao"),
    referencias: valorDeTextarea(html, "txaReferencia"),
    natJus: valorDeSelect(html, "txtNatResponsavel") || valorDeInput(html, "txtInstituicaoResponsavel"),
    anexo: valorDeInput(html, "anexoConclusao"),
    anexoHash: /name="anexoConclusao"\s+value="([a-f0-9]{8,})"/i.exec(html)?.[1] ?? "",
    url,
  };

  if (!nota.principioAtivo && !nota.conclusao) {
    throw new Error(`não consegui ler a nota ${id} (a página pública pode ter mudado)`);
  }
  return nota;
}

/**
 * Resumo da nota no formato que a análise do Tema 6 entende — é este texto que
 * vai para o campo da nota e alimenta os requisitos (c) e (d).
 */
export function resumirNota(nota: ConteudoDaNota): string {
  const linhas = [
    `Nota técnica do e-NatJus nº ${nota.id} (${nota.natJus}).`,
    `Tecnologia: ${nota.principioAtivo}. CID: ${nota.cid}.`,
    `Conclusão: ${nota.conclusao || "não informada"}.`,
    `Há evidência científica: ${nota.evidenciaCientifica || "não informado"}.`,
    `Situação na CONITEC: ${nota.situacaoConitec || "não informada"}.`,
    `Disponível no SUS: ${nota.disponivelNoSus || "não informado"}. Previsto em PCDT: ${nota.previstoEmProtocolo || "não informado"}.`,
  ];
  if (nota.opcoesNoSus) linhas.push(`Opções disponíveis no SUS segundo a nota: ${nota.opcoesNoSus}`);
  if (nota.textoDoAnexo) linhas.push(`Conteúdo do anexo "${nota.anexo}":\n${nota.textoDoAnexo}`);
  if (nota.textoDaConclusao) linhas.push(`Fundamentação: ${nota.textoDaConclusao}`);
  if (nota.referencias) linhas.push(`Referências: ${nota.referencias}`);
  if (!nota.opcoesNoSus && !nota.textoDaConclusao && !nota.textoDoAnexo && nota.anexo) {
    linhas.push(
      `A nota não preencheu os campos de texto; o conteúdo está no anexo "${nota.anexo}". Confira em ${nota.url}`,
    );
  }
  return linhas.join("\n");
}
