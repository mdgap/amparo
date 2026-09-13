import { useState } from "react";
import { Button } from "@heroui/react";
import { IconeChevron, IconeOk } from "./Icones.tsx";
import type { Prompts as PromptsDaAnalise } from "../lib/api.ts";

/**
 * Transparência para auditoria: o que foi enviado ao modelo, literalmente.
 *
 * Fica fechado por padrão — é material de auditor, não de uso diário. Aberto,
 * mostra o prompt cru, sem formatação, porque qualquer renderização é
 * interpretação, e interpretação é o que auditoria não quer.
 */
export function Prompts({ prompts }: { prompts: PromptsDaAnalise }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiar(texto: string, id: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  }

  const tudo = prompts.etapas
    .map(
      (e) =>
        `# ${e.titulo}\n\n## Instrução de sistema\n\n${e.sistema}\n\n## Mensagem enviada\n\n${e.usuario}`,
    )
    .join("\n\n---\n\n");

  return (
    <details className="mt-8 rounded-2xl border border-[var(--border)] bg-surface">
      <summary className="controle flex cursor-pointer list-none items-center gap-3 p-6">
        <IconeChevron className="size-5 shrink-0 text-muted" />
        <div>
          <h2 className="fonte-display text-lg font-semibold">
            Transparência: o que foi enviado ao modelo
          </h2>
          <p className="mt-1 text-sm text-muted">
            Os prompts desta análise, na íntegra. Para auditoria.
          </p>
        </div>
      </summary>

      <div className="border-t border-[var(--border)] px-6 py-5">
        <dl className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { rotulo: "Modelo", valor: prompts.modelo },
            { rotulo: "Versão do prompt", valor: prompts.promptVersao },
            { rotulo: "Temperatura", valor: String(prompts.temperatura) },
            {
              rotulo: "Retenção pelo provedor",
              valor: prompts.zeroDataRetention ? "nenhuma (ZDR)" : "não garantida",
            },
          ].map((m) => (
            <div key={m.rotulo}>
              <dt className="text-sm text-muted">{m.rotulo}</dt>
              <dd className="num mt-0.5 font-medium">{m.valor}</dd>
            </div>
          ))}
        </dl>

        <div className="mb-5 flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" onPress={() => void copiar(tudo, "tudo")}>
            {copiado === "tudo" ? <IconeOk className="size-4" /> : null}
            {copiado === "tudo" ? "Copiado" : "Copiar tudo em Markdown"}
          </Button>
        </div>

        {prompts.etapas.map((etapa) => (
          <section key={etapa.id} className="mb-6 last:mb-0">
            <h3 className="fonte-display mb-3 font-semibold">{etapa.titulo}</h3>

            {[
              { id: `${etapa.id}-sistema`, rotulo: "Instrução de sistema", texto: etapa.sistema },
              { id: `${etapa.id}-usuario`, rotulo: "Mensagem enviada", texto: etapa.usuario },
            ].map((bloco) => (
              <div key={bloco.id} className="mb-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">{bloco.rotulo}</h4>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => void copiar(bloco.texto, bloco.id)}
                  >
                    {copiado === bloco.id ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                {/* Texto cru: qualquer renderização seria interpretação. */}
                <pre className="max-h-80 overflow-auto rounded-xl bg-[var(--surface-secondary)] p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {bloco.texto || "(vazio)"}
                </pre>
              </div>
            ))}
          </section>
        ))}

        <p className="border-t border-[var(--border)] pt-4 text-sm text-muted">
          Os documentos aparecem aqui como o modelo os recebeu, já anonimizados.
          Os números de custo, foro e polo passivo chegam prontos, com instrução
          explícita de não recalcular.
        </p>
      </div>
    </details>
  );
}
