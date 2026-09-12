import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { baixarAnexo, buscarNotas, lerNota, resumirNota } from "../natjus/busca.ts";
import { extrairTextoDePdf } from "../documentos/pdf.ts";
import { lerPdfPorOcr } from "../documentos/ocr.ts";
import { anonimizar } from "../documentos/anonimizar.ts";

const schema = z.object({
  q: z.string().min(3),
  cid: z.string().optional(),
  conclusao: z.enum(["favoravel", "nao_favoravel"]).optional(),
  pagina: z.coerce.number().int().min(1).max(50).optional(),
});

export async function rotasNatJus(app: FastifyInstance) {
  /**
   * Notas técnicas do e-NatJus para um princípio ativo. Consulta pública do
   * CNJ, sem autenticação — devolvemos a lista e o link, e quem escolhe a nota
   * do caso é o advogado.
   */
  app.get("/natjus", async (req, reply) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ erro: "informe ao menos 3 caracteres em q" });
    }

    try {
      return await buscarNotas({ principioAtivo: parsed.data.q, ...parsed.data });
    } catch (e) {
      req.log.warn({ e }, "consulta ao e-NatJus falhou");
      // Degrada: sem nota, o produto segue como antes de existir esta busca.
      return reply.code(502).send({
        erro:
          "Não consegui consultar o e-NatJus agora. A consulta pública do CNJ pode estar fora do ar — " +
          "cole a nota manualmente se já tiver.",
      });
    }
  });

  /** Conteúdo de uma nota, já resumido no formato que a análise consome. */
  app.get<{ Params: { id: string } }>("/natjus/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(400).send({ erro: "id inválido" });
    }

    try {
      const nota = await lerNota(id);

      // O conteúdo da nota mora no PDF: sem ele, sobra a conclusão e pouco
      // mais. Falha aqui não derruba a leitura — os campos estruturados já
      // valem, e o link do anexo continua na resposta.
      if (nota.anexoHash && !nota.opcoesNoSus && !nota.textoDaConclusao) {
        nota.textoDoAnexo = await lerAnexo(nota.anexoHash).catch(() => undefined);
      }

      // A nota técnica é documento público, mas traz dado de OUTRO paciente:
      // nome, data de nascimento e cidade de quem moveu aquela ação. Importar
      // isso sem anonimizar seria trazer para dentro do produto exatamente o
      // que ele promete não tratar. Falha fechada, como no resto.
      const limpo = await anonimizar(resumirNota(nota)).catch(() => null);
      if (!limpo) {
        return reply.code(503).send({
          erro:
            "O serviço de anonimização não respondeu. A nota não foi importada — " +
            "ela contém dados do paciente daquele processo.",
        });
      }

      return {
        nota: { ...nota, textoDoAnexo: undefined },
        texto: limpo.texto,
        removidos: limpo.removidos,
      };
    } catch (e) {
      req.log.warn({ e }, "leitura da nota do e-NatJus falhou");
      return reply.code(502).send({
        erro:
          "Não consegui ler essa nota agora. Abra a página pública do e-NatJus e cole o conteúdo manualmente.",
      });
    }
  });
}

/** Texto do anexo: extração direta e, se for digitalizado, OCR. */
async function lerAnexo(hash: string): Promise<string | undefined> {
  const pdf = await baixarAnexo(hash);
  const extraido = await extrairTextoDePdf(pdf);
  if (extraido.natureza === "digital") return extraido.texto;

  const ocr = await lerPdfPorOcr(pdf);
  return ocr.texto.trim() || undefined;
}
