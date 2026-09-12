import { env } from "../env.ts";

/**
 * Cliente da OpenRouter (API compatível com a da OpenAI). Uma chave só para
 * redação, classificação e embeddings.
 */
function cabecalhos() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY ausente: a etapa de IA está desligada.");
  }
  return {
    "content-type": "application/json",
    authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    // Identificação do app nos rankings da OpenRouter; opcional.
    "X-Title": "MindTheGap",
  };
}

/**
 * Extrai o objeto JSON da resposta. Modelo aberto às vezes embrulha em cerca
 * markdown ou escreve uma frase antes — pegar do primeiro `{` ao último `}`
 * é mais robusto que confiar no formato.
 */
function extrairJSON(texto: string): string {
  const limpo = texto.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
  const i = limpo.indexOf("{");
  const f = limpo.lastIndexOf("}");
  if (i < 0 || f <= i) {
    throw new Error(`resposta do modelo não contém JSON: ${texto.slice(0, 200)}`);
  }
  return limpo.slice(i, f + 1);
}

/** Pede JSON ao modelo e valida com um schema zod antes de devolver. */
export async function pedirJSON<T>(args: {
  system: string;
  prompt: string;
  schema: { parse: (v: unknown) => T };
  maxTokens?: number;
}): Promise<T> {
  const resp = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      max_tokens: args.maxTokens ?? 4096,
      // Determinismo é requisito do produto: mesma entrada, mesma saída.
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.prompt },
      ],
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenRouter ${resp.status}: ${await resp.text()}`);
  }

  const json = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (json.error) throw new Error(`OpenRouter: ${json.error.message}`);

  const texto = json.choices?.[0]?.message?.content ?? "";
  return args.schema.parse(JSON.parse(extrairJSON(texto)));
}
