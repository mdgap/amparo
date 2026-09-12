import { IconeAusente, IconeOk, IconeRevisao } from "./Icones.tsx";
import type { StatusRequisito } from "../lib/api.ts";

/**
 * Estado de análise. Cor sozinha nunca comunica: cada estado tem ícone,
 * rótulo textual e contraste AA. "Evidência localizada" descreve o documento,
 * não um juízo de procedência.
 */
export const ESTADOS = {
  ok: {
    rotulo: "Evidência localizada",
    Icone: IconeOk,
    classe: "bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)]",
  },
  fraco: {
    rotulo: "Revisão necessária",
    Icone: IconeRevisao,
    classe: "bg-[var(--status-atencao-bg)] text-[var(--status-atencao-fg)]",
  },
  falta: {
    rotulo: "Informação não localizada",
    Icone: IconeAusente,
    classe: "bg-[var(--status-erro-bg)] text-[var(--status-erro-fg)]",
  },
  nao_avaliado: {
    rotulo: "Não analisado",
    Icone: IconeAusente,
    classe: "bg-[var(--surface-tertiary)] text-[var(--muted)]",
  },
} as const satisfies Record<StatusRequisito, unknown>;

export function Estado({
  status,
  className = "",
}: {
  status: StatusRequisito;
  className?: string;
}) {
  const { rotulo, Icone, classe } = ESTADOS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${classe} ${className}`}
    >
      <Icone className="size-4 shrink-0" />
      {rotulo}
    </span>
  );
}
