/**
 * OCR para PDF digitalizado — a "leitura" da imagem, sem IA generativa.
 *
 * Roda no próprio contêiner: o documento não sai da infraestrutura, que é a
 * premissa de toda a anonimização. Usa poppler para virar imagem e tesseract
 * para ler, ambos instalados na imagem.
 *
 * O resultado é sempre inferior ao de um PDF digital. Carimbo por cima, foto
 * torta e letra ruim produzem erro — e erro aqui é grave, porque um nome mal
 * lido não é encontrado depois pela anonimização. Por isso a saída vem com um
 * indicador de confiança, para a interface pedir conferência.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const executar = promisify(execFile);

/** Teto de páginas: laudo é curto, e OCR de 300 páginas derruba o contêiner. */
const MAXIMO_DE_PAGINAS = 30;
/** 300 dpi é o padrão para OCR de documento impresso. */
const RESOLUCAO = 300;

export interface TextoOcr {
  texto: string;
  paginasLidas: number;
  /** Confiança média do tesseract, de 0 a 100. Abaixo de 70 pede conferência. */
  confianca: number;
}

export async function lerPdfPorOcr(arquivo: Uint8Array): Promise<TextoOcr> {
  const dir = await mkdtemp(join(tmpdir(), "ocr-"));
  try {
    const pdf = join(dir, "doc.pdf");
    await writeFile(pdf, arquivo);

    // PDF -> PNG, uma imagem por página.
    await executar("pdftoppm", [
      "-r", String(RESOLUCAO),
      "-png",
      "-l", String(MAXIMO_DE_PAGINAS),
      pdf,
      join(dir, "pag"),
    ]);

    const imagens = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
    const paginas: string[] = [];
    const confiancas: number[] = [];

    for (const imagem of imagens) {
      const { stdout } = await executar("tesseract", [
        join(dir, imagem),
        "stdout",
        "-l", "por",
        "--psm", "1", // segmentação automática, com detecção de orientação
      ]);
      const texto = stdout.replace(/[ \t]+/g, " ").trim();
      if (texto) paginas.push(texto);
      confiancas.push(await confiancaDaPagina(join(dir, imagem)));
    }

    return {
      texto: paginas.join("\n\n"),
      paginasLidas: imagens.length,
      confianca: confiancas.length
        ? Math.round(confiancas.reduce((a, b) => a + b, 0) / confiancas.length)
        : 0,
    };
  } finally {
    // O documento do caso não fica em disco depois da leitura.
    await rm(dir, { recursive: true, force: true });
  }
}

/** Média da confiança por palavra que o tesseract reporta no modo TSV. */
async function confiancaDaPagina(imagem: string): Promise<number> {
  try {
    const { stdout } = await executar("tesseract", [imagem, "stdout", "-l", "por", "tsv"]);
    const valores = stdout
      .split("\n")
      .slice(1)
      .map((l) => Number(l.split("\t")[10]))
      .filter((n) => Number.isFinite(n) && n >= 0);
    if (!valores.length) return 0;
    return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
  } catch {
    return 0;
  }
}
