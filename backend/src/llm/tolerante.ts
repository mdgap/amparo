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
