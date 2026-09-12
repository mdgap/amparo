import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.ts";

let cliente: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ausente: a etapa de IA está desligada.");
  }
  cliente ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cliente;
}

/** Pede JSON ao modelo e valida com um schema zod antes de devolver. */
export async function pedirJSON<T>(args: {
  system: string;
  prompt: string;
  schema: { parse: (v: unknown) => T };
  maxTokens?: number;
}): Promise<T> {
  const resp = await anthropic().messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: args.maxTokens ?? 4096,
    system: args.system,
    messages: [
      { role: "user", content: args.prompt },
      // Prefill: força a resposta a começar como JSON.
      { role: "assistant", content: "{" },
    ],
  });

  const texto = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  return args.schema.parse(JSON.parse("{" + texto));
}
