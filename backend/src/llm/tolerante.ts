import { z } from "zod";

/**
 * Lista de textos tolerante a formato.
 *
 * Modelo aberto (`gpt-oss-120b`) às vezes devolve uma string única onde o
 * schema pede array — foi o que quebrou a primeira análise real. Normalizar na
 * borda é mais barato e mais portátil que depender do structured output de
 * cada provedor: se amanhã trocarmos o modelo no `.env`, isto continua valendo.
 *
 * Uma string com quebras de linha ou " | " vira várias entradas; marcador de
 * lista no começo é descartado.
 */
export const listaDeTextos = z.preprocess((valor) => {
  if (typeof valor !== "string") return valor;
  const texto = valor.trim();
  if (!texto) return [];
  const partes = texto
    .split(/\n+|\s\|\s/)
    .map((p) => p.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
  return partes.length > 1 ? partes : [texto];
}, z.array(z.string()));

/**
 * Remove nulos antes de validar.
 *
 * Zod distingue `null` de ausente, mas o modelo não: `gpt-oss-120b` devolve
 * `"alertaENatJus": null` quando quer dizer "não há alerta", e o schema com
 * `.optional()` rejeitava — a análise inteira voltava 500 depois de dois
 * minutos de modelo. Tratar null como ausente vale para qualquer campo
 * opcional, presente ou futuro, e não muda nada quando o campo vem preenchido.
 */
export function semNulos<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.filter((v) => v !== null && v !== undefined).map(semNulos) as T;
  }
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor)) {
      if (v !== null && v !== undefined) saida[chave] = semNulos(v);
    }
    return saida as T;
  }
  return valor;
}

/**
 * Tira Markdown do texto das peças.
 *
 * O dossiê é copiado para dentro de uma petição: asterisco de negrito e
 * cerquilha de título não têm lugar lá, e apareciam crus na tela porque a
 * interface renderiza texto puro. A instrução no prompt reduz, não elimina —
 * modelo aberto reincide. Limpar na saída é o que garante.
 *
 * Marcador de lista vira travessão, que é a convenção de peça processual.
 */
export function semMarkdown(texto: string): string {
  return texto
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^(\s*)[-*+]\s+/gm, "$1— ")
    .replace(/\*\*\*(.+?)\*\*\*/gs, "$1")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/(?<!\w)__(.+?)__(?!\w)/gs, "$1")
    .replace(/(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])/gs, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g, "$1 ($2)")
    .replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Troca os marcadores [F1], [F2] pelo nome da norma que eles apontam.
 *
 * O marcador é a trilha de auditoria dentro do prompt, e serve enquanto o
 * texto está na tela ao lado da legenda. Mas as peças são copiadas para dentro
 * de petição e de requerimento, onde "[F2]" não diz nada a quem lê — e o
 * número nem é estável: a busca no corpus é refeita a cada análise.
 *
 * Substituir é melhor que apagar: preserva a citação e a torna verificável
 * fora do produto. Marcador que não corresponde a nenhuma fonte enviada vira
 * "sem fonte no corpus", a mesma expressão que o prompt manda usar quando não
 * há trecho que sustente — o erro fica visível em vez de sumir.
 */

/** Um marcador, ou vários ligados por vírgula ou "e". */
const MARCADORES = String.raw`\[F\d+\](?:\s*(?:,|e)\s*\[F\d+\])*`;

export function comFontesPorExtenso(
  texto: string,
  fontes: { documento: string; ancora: string | null }[],
): string {
  /** Nome citável: o título até o travessão, mais a âncora quando for curta. */
  const nome = (i: number): string | null => {
    const f = fontes[i];
    if (!f) return null;
    const curto = f.documento.split(" — ")[0]!.trim();
    const ancora = f.ancora?.split(" — ")[0]?.trim();
    return ancora && ancora.length <= 40 ? `${curto}, ${ancora}` : curto;
  };

  const trocar = (marcadores: string, entreParenteses: boolean) => {
    const nomes = [...marcadores.matchAll(/\[F(\d+)\]/g)]
      .map((m) => nome(Number(m[1]) - 1) ?? "sem fonte no corpus")
      .filter((n, i, todos) => todos.indexOf(n) === i);
    if (!nomes.length) return marcadores;
    const lista =
      nomes.length === 1
        ? nomes[0]!
        : `${nomes.slice(0, -1).join("; ")} e ${nomes.at(-1)!}`;
    return entreParenteses ? `(${lista})` : lista;
  };

  return (
    texto
      // "(fonte: [F4])" — o parêntese já está no texto, troca só o miolo.
      .replace(
        new RegExp(`\\(\\s*fontes?\\s*:?\\s*(${MARCADORES})\\s*\\)`, "gi"),
        (_, m: string) => `(${trocar(m, false)})`,
      )
      // "fonte [F2]", "fontes [F1] e [F3]" — a palavra sai com o marcador.
      .replace(
        new RegExp(`\\bfontes?\\s*:?\\s*(${MARCADORES})`, "gi"),
        (_, m: string) => trocar(m, false),
      )
      // Marcador solto no meio da frase ganha parêntese.
      .replace(new RegExp(`(${MARCADORES})`, "g"), (m) => trocar(m, true))
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+$/gm, "")
      .trim()
  );
}
