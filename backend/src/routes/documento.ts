import type { FastifyInstance } from "fastify";
import { extrairTextoDePdf } from "../documentos/pdf.ts";
import { lerPdfPorOcr } from "../documentos/ocr.ts";

/** Teto do arquivo. Laudo é curto; acima disso é engano ou abuso. */
const TAMANHO_MAXIMO = 20 * 1024 * 1024;
/** Abaixo disto o OCR leu mal e a interface precisa pedir conferência. */
const CONFIANCA_MINIMA = 70;

export async function rotasDeDocumento(app: FastifyInstance) {
  /**
   * Recebe um PDF e devolve o texto. Digital sai por extração; digitalizado sai
   * por OCR, no próprio contêiner. O arquivo NÃO é persistido em lugar nenhum:
   * é lido em memória, processado e descartado.
   */
  app.post("/documento", async (req, reply) => {
    const arquivo = await req.file({ limits: { fileSize: TAMANHO_MAXIMO } });
    if (!arquivo) return reply.code(400).send({ erro: "envie um arquivo PDF" });
    if (!arquivo.mimetype.includes("pdf")) {
      return reply.code(415).send({ erro: "só PDF por enquanto" });
    }

    let dados: Buffer;
    try {
      dados = await arquivo.toBuffer();
    } catch {
      return reply.code(413).send({ erro: "arquivo maior que 20 MB" });
    }

    const extraido = await extrairTextoDePdf(new Uint8Array(dados)).catch(() => null);
    if (!extraido) return reply.code(422).send({ erro: "não consegui abrir este PDF" });

    if (extraido.natureza === "digital") {
      return {
        origem: "texto-do-pdf",
        texto: extraido.texto,
        paginas: extraido.paginas,
        precisaConferencia: false,
      };
    }

    // Sem camada de texto: é imagem. Só o OCR resolve.
    const ocr = await lerPdfPorOcr(new Uint8Array(dados)).catch(() => null);
    if (!ocr || !ocr.texto.trim()) {
      return reply.code(422).send({
        erro: "Este PDF é imagem e o OCR não conseguiu ler. Envie um PDF gerado por sistema, ou cole o texto.",
      });
    }

    return {
      origem: "ocr",
      texto: ocr.texto,
      paginas: ocr.paginasLidas,
      confianca: ocr.confianca,
      // OCR erra, e nome mal lido não é encontrado depois pela anonimização.
      precisaConferencia: ocr.confianca < CONFIANCA_MINIMA,
    };
  });
}
