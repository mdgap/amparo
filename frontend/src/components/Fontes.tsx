import { IconeBalanca, IconeChevron, IconeSeta } from "./Icones.tsx";
import type { Fonte } from "../lib/api.ts";

/**
 * Os trechos do corpus que o modelo recebeu, na ordem em que foram numerados.
 *
 * Os fundamentos das minutas apontam para eles como [F1], [F2]. Sem esta
 * lista o marcador não tem como ser resolvido: quem lê a peça não descobre de
 * qual norma a afirmação saiu, e a citação vira referência morta.
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
          Os {fontes.length} trechos do corpus oficial enviados ao modelo. Os
          fundamentos das minutas apontam para eles por [F1], [F2]. A numeração
          vale só para este caso: a busca é refeita a cada análise.
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
