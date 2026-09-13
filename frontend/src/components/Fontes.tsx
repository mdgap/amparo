import { IconeBalanca, IconeChevron, IconeSeta } from "./Icones.tsx";
import type { Fonte } from "../lib/api.ts";

/**
 * Os trechos do corpus que o modelo recebeu, na ordem em que foram numerados.
 *
 * O modelo os recebe numerados como [F1], [F2] e cita por esse marcador; na
 * saída, `comFontesPorExtenso` troca o marcador pelo nome da norma, porque a
 * peça é copiada para fora do produto. Esta lista é o outro lado disso: mostra
 * o trecho exato por trás de cada citação e o link do portal de origem.
 *
 * A numeração vale só para esta análise: a busca no corpus é feita por caso.
 */
export function Fontes({ fontes }: { fontes: Fonte[] }) {
  return (
    <section
      aria-label="Fontes citadas"
      className="mt-8 rounded-2xl border border-[var(--border)] bg-surface"
    >
      <div className="border-b border-[var(--border)] px-6 py-5">
        <h2 className="fonte-display flex items-center gap-2 text-lg font-semibold">
          <IconeBalanca className="size-5" />
          Fontes citadas nesta análise
        </h2>
        <p className="mt-1 text-sm text-muted">
          Os {fontes.length} trechos do corpus oficial enviados ao modelo nesta
          análise. As minutas citam estas normas pelo nome; aqui está o trecho
          exato que sustentou cada citação, com o link para o portal de origem.
        </p>
      </div>

      <ol className="divide-y divide-[var(--border)]">
        {fontes.map((f, i) => (
          <li key={f.trecho_id}>
            <details className="group">
              <summary className="controle flex cursor-pointer list-none items-start gap-3 px-6 py-4">
                <span className="num shrink-0 rounded-[0.375rem] border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-[0.1875rem] text-[0.6875rem] font-medium">
                  F{i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-relaxed">
                  {f.documento}
                  {f.ancora && (
                    <span className="block text-xs text-muted">{f.ancora}</span>
                  )}
                </span>
                <IconeChevron className="mt-0.5 size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-5">
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {f.conteudo}
                </p>
                {f.url_oficial && (
                  <a
                    className="mt-4 inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
                    href={f.url_oficial}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir no portal oficial
                    <IconeSeta className="size-4" />
                  </a>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
