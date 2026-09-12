/**
 * Extração de texto de PDF, sem IA.
 *
 * PDF tem duas naturezas e elas se comportam de forma oposta: o digital, gerado
 * por sistema, traz o texto dentro do arquivo; o digitalizado é imagem, e
 * devolve string vazia. Confundir os dois é o erro que faz o produto seguir com
 * documento vazio e o advogado achar que deu certo — por isso a extração
 * CLASSIFICA em vez de só devolver texto.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export type NaturezaDoPdf = "digital" | "digitalizado" | "vazio";

export interface TextoExtraido {
  natureza: NaturezaDoPdf;
  texto: string;
  paginas: number;
  /** Caracteres de texto por página — o que separa digital de digitalizado. */
  caracteresPorPagina: number;
}

/**
 * Abaixo disto a página é imagem com, no máximo, um carimbo ou número de folha.
 * Um laudo digital tem centenas de caracteres por página.
 */
const MINIMO_POR_PAGINA = 40;

/**
 * Decide a natureza a partir do que foi extraído. Separado da leitura do
 * arquivo para poder ser testado sem PDF — é aqui que mora a regra.
 */
export function classificarPdf(
  texto: string,
  paginas: number,
): { natureza: NaturezaDoPdf; caracteresPorPagina: number } {
  const caracteresPorPagina = paginas > 0 ? Math.round(texto.length / paginas) : 0;
  const natureza: NaturezaDoPdf =
    texto.trim().length === 0
      ? "vazio"
      : caracteresPorPagina < MINIMO_POR_PAGINA
        ? "digitalizado"
        : "digital";
  return { natureza, caracteresPorPagina };
}

export async function extrairTextoDePdf(arquivo: Uint8Array): Promise<TextoExtraido> {
  const doc = await getDocument({
    data: arquivo,
    // O PDF é do usuário: nada de buscar fonte ou recurso externo ao abrir.
    disableFontFace: true,
  }).promise;

  const partes: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n);
    const conteudo = await pagina.getTextContent();
    const linha = conteudo.items
      .map((i) => ("str" in i ? i.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      // Quebra antes de item numerado ("2.1.", "4."): o PDF vem como uma
      // linha só, e sem estrutura o reconhecimento de nome próprio piora
      // muito — é assim que nome de paciente escapa da anonimização.
      .replace(/\s(?=\d{1,2}(?:\.\d{1,2})*\.?\s+[A-ZÁ-Ú])/g, "\n")
      .trim();
    if (linha) partes.push(linha);
  }
  // O documento do caso não fica na memória do processo além do necessário.
  await doc.cleanup();

  const texto = partes.join("\n\n");
  const paginas = doc.numPages;
  return { texto, paginas, ...classificarPdf(texto, paginas) };
}

/**
 * Metadados do PDF (Autor, Título) costumam trazer o nome de quem gerou o
 * arquivo. Nunca são lidos para o conteúdo — esta função existe para deixar
 * explícito que são descartados, não esquecidos.
 */
export const METADADOS_DESCARTADOS = true;
