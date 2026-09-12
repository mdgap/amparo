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
