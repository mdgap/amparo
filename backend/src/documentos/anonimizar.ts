import { env } from "../env.ts";
import { query } from "../db.ts";

/**
 * Anonimização do documento do caso, antes de qualquer coisa.
 *
 * Chama o serviço `anonimizador`, que roda na nossa infraestrutura: o texto
 * identificado não sai daqui. ZDR na OpenRouter garante que o provedor não
 * guarda o que recebe — não que ele não receba.
 *
 * FALHA FECHADA. Se o serviço não responder, o documento é recusado. Devolver
 * texto identificado em silêncio seria pior que não funcionar: quebraria a
 * promessa justamente quando ninguém está olhando.
 */
export interface TextoAnonimizado {
  texto: string;
  removidos: Record<string, number>;
  total: number;
}

/** Vocabulário clínico protegido: sem ele o modelo apaga "lamotrigina". */
let preservar: string[] | null = null;
async function vocabularioClinico(): Promise<string[]> {
  preservar ??= (
    await query<{ principio_ativo: string }>(
      "SELECT DISTINCT principio_ativo FROM cmed_preco",
    )
  )
    .flatMap((r) => r.principio_ativo.split(";"))
    .map((t) => t.trim())
    .filter((t) => t.length >= 5);
  return preservar;
}

/**
 * Anonimiza vários documentos de uma vez, preservando a separação entre eles.
 * Devolve os textos na mesma ordem e o placar somado.
 */
export async function anonimizarVarios(
  textos: string[],
): Promise<{ textos: string[]; removidos: Record<string, number>; total: number }> {
  const limpos = await Promise.all(
    textos.map((t) => (t.trim() ? anonimizar(t) : Promise.resolve(null))),
  );
  const removidos: Record<string, number> = {};
  for (const l of limpos) {
    for (const [marcador, n] of Object.entries(l?.removidos ?? {})) {
      removidos[marcador] = (removidos[marcador] ?? 0) + n;
    }
  }
  return {
    textos: limpos.map((l, i) => l?.texto ?? textos[i]!),
    removidos,
    total: Object.values(removidos).reduce((a, b) => a + b, 0),
  };
}

export async function anonimizar(texto: string): Promise<TextoAnonimizado> {
  const resp = await fetch(`${env.ANONIMIZADOR_URL}/anonimizar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ texto, preservar: await vocabularioClinico() }),
  });

  if (!resp.ok) {
    throw new Error(`anonimizador respondeu ${resp.status}`);
  }
  return (await resp.json()) as TextoAnonimizado;
}
