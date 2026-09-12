import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.ts";
import { extrairPosologia, reconhecerMedicamentos } from "../domain/cmed.ts";

/** Busca de apresentação na tabela CMED — origem do preço usado no cálculo. */
export async function rotasCmed(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string } }>("/cmed", async (req, reply) => {
    const q = (req.query.q ?? "").trim();
    if (q.length < 3) return reply.code(400).send({ erro: "informe ao menos 3 caracteres" });

    return query(
      `SELECT id, principio_ativo, produto, apresentacao, laboratorio,
              pmvg_0, unidades_por_apresentacao, tabela_versao
         FROM cmed_preco
        WHERE produto % $1 OR principio_ativo % $1
        ORDER BY GREATEST(similarity(produto, $1), similarity(principio_ativo, $1)) DESC
        LIMIT 20`,
      [q],
    );
  });

  /**
   * Vocabulário de princípios ativos da CMED. Pequeno (~2,2 mil) e estável
   * entre cargas: carregado uma vez e mantido em memória.
   */
  let vocabulario: string[] | null = null;
  async function carregarVocabulario(): Promise<string[]> {
    vocabulario ??= (
      await query<{ principio_ativo: string }>(
        "SELECT DISTINCT principio_ativo FROM cmed_preco",
      )
    ).map((r) => r.principio_ativo);
    return vocabulario;
  }

  const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
  const schema = z.object({
    laudo: z.string().default(""),
    receita: z.string().default(""),
  });

  /**
   * Reconhece o medicamento no texto do laudo cruzando com o vocabulário da
   * CMED. Determinístico e local: nada vai para o modelo, e o que não está na
   * lista oficial não é medicamento.
   */
  app.post("/reconhecer", async (req, reply) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: parsed.error.issues });

    const { laudo, receita } = parsed.data;
    if (CPF.test(`${laudo}\n${receita}`)) {
      return reply.code(422).send({
        erro: "CPF detectado no texto. Remova dados pessoais antes de enviar.",
      });
    }
    if (`${laudo}${receita}`.trim().length < 10) {
      return reply.code(400).send({ erro: "envie o laudo ou a receita" });
    }

    const vocabulario = await carregarVocabulario();

    // A receita é a fonte mais confiável de QUAL medicamento: ela só contém o
    // que está sendo prescrito. O laudo cita também o que já falhou.
    const daReceita = new Set(
      reconhecerMedicamentos(receita, vocabulario).map((a) => a.principioAtivo),
    );

    // Sem corte apertado: num laudo de epilepsia refratária o pleiteado vem
    // depois de seis alternativas já tentadas, e um slice(0,5) o descartava.
    const achados = reconhecerMedicamentos(`${laudo}\n${receita}`, vocabulario)
      .map((a) => (daReceita.has(a.principioAtivo) ? { ...a, papel: "pedido" as const } : a))
      .sort((a, b) => Number(b.papel === "pedido") - Number(a.papel === "pedido"))
      .slice(0, 12);

    // Posologia: a receita primeiro; o laudo só completa o que faltar.
    const daReceitaPosologia = extrairPosologia(receita);
    const doLaudo = extrairPosologia(laudo);
    const posologia = {
      unidadesPorTomada: daReceitaPosologia.unidadesPorTomada ?? doLaudo.unidadesPorTomada,
      tomadasPorDia: daReceitaPosologia.tomadasPorDia ?? doLaudo.tomadasPorDia,
      diasPorAno: daReceitaPosologia.diasPorAno ?? doLaudo.diasPorAno,
      evidencias: [...new Set([...daReceitaPosologia.evidencias, ...doLaudo.evidencias])],
    };

    if (!achados.length) return { achados: [], apresentacoes: [], posologia };

    // Ordem dos princípios reconhecidos primeiro, preço depois: o laudo cita
    // tanto o pleiteado quanto o que já falhou, e o pleiteado costuma ser o
    // casamento mais forte. Qual apresentação usar é escolha do advogado.
    const apresentacoes = await query(
      `SELECT id, principio_ativo, produto, apresentacao, laboratorio,
              pmvg_0, unidades_por_apresentacao, tabela_versao
         FROM cmed_preco
        WHERE principio_ativo = ANY($1)
        ORDER BY array_position($1, principio_ativo), pmvg_0 NULLS LAST
        LIMIT 20`,
      [achados.map((a) => a.principioAtivo)],
    );

    return { achados, apresentacoes, posologia };
  });
}
