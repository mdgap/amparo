import type { ReactNode } from "react";
import {
  IconeAchados, IconeConferencia, IconeDossie, IconeUpload,
} from "./Icones.tsx";

export type EtapaId = "documentos" | "conferencia" | "achados" | "dossie";

export const ETAPAS = [
  { id: "documentos", rotulo: "Documentos", Icone: IconeUpload },
  { id: "conferencia", rotulo: "Conferência", Icone: IconeConferencia },
  { id: "achados", rotulo: "Achados", Icone: IconeAchados },
  { id: "dossie", rotulo: "Dossiê", Icone: IconeDossie },
] as const satisfies readonly { id: EtapaId; rotulo: string; Icone: unknown }[];

interface Props {
  etapa: EtapaId;
  liberadas: Set<EtapaId>;
  onIr: (etapa: EtapaId) => void;
  children: ReactNode;
}

/**
 * Navegação compacta à esquerda no desktop; no mobile vira uma trilha
 * horizontal acima do conteúdo, preservando a ordem de leitura.
 */
export function Shell({ etapa, liberadas, onIr, children }: Props) {
  return (
    <div className="min-h-dvh lg:flex">
      <nav
        aria-label="Etapas da análise"
        className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface lg:h-dvh lg:w-60 lg:shrink-0 lg:self-start lg:border-e lg:border-b-0"
      >
        <div className="flex items-center gap-2 px-4 py-4 lg:px-6">
          <span className="gradiente-marca size-7 rounded-lg" />
          <span className="fonte-display text-lg font-bold tracking-tight">
            MindTheGap
          </span>
        </div>

        <ol className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
          {ETAPAS.map((e, i) => {
            const ativa = e.id === etapa;
            const disponivel = liberadas.has(e.id);
            return (
              <li key={e.id} className="shrink-0 lg:w-full">
                <button
                  aria-current={ativa ? "step" : undefined}
                  className={`controle flex w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors
                    ${ativa ? "bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]" : "text-foreground hover:bg-[var(--surface-tertiary)]"}
                    ${disponivel ? "" : "cursor-not-allowed opacity-50"}`}
                  disabled={!disponivel}
                  type="button"
                  onClick={() => onIr(e.id)}
                >
                  <e.Icone className="size-5 shrink-0" />
                  <span className="whitespace-nowrap">{e.rotulo}</span>
                  <span className="ms-auto hidden text-xs text-muted lg:inline">
                    {i + 1}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
