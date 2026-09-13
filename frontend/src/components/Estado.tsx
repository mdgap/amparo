import type { StatusRequisito } from "../lib/api.ts";

/**
 * Estado de análise. Cor sozinha nunca comunica: cada estado tem ícone,
 * rótulo textual e contraste AA. "Evidência localizada" descreve o documento,
 * não um juízo de procedência.
 */
export const ESTADOS = {
  ok: {
    rotulo: "Evidência localizada",
    classe: "bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)] border-[#c8e5d2]",
  },
  fraco: {
    rotulo: "Revisão necessária",
    classe: "bg-[var(--status-atencao-bg)] text-[var(--status-atencao-fg)] border-[#efd7a8]",
  },
  falta: {
    rotulo: "Informação não localizada",
    classe: "bg-[var(--status-erro-bg)] text-[var(--status-erro-fg)] border-[#f0cbc5]",
  },
  nao_avaliado: {
    rotulo: "Não analisado",
    classe: "bg-[#eef1ef] text-[#536259] border-[#d7ded9]",
  },
} as const satisfies Record<StatusRequisito, unknown>;

export function Estado({
  status,
  className = "",
}: {
  status: StatusRequisito;
  className?: string;
}) {
  const { rotulo, classe } = ESTADOS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[0.375rem] border px-2 py-[0.3125rem] text-[0.6875rem] leading-[1.5] ${classe} ${className}`}
    >
      {/* O ponto reforça; quem carrega o significado é o texto ao lado. */}
      <span aria-hidden="true" className="ponto-estado" />
      {rotulo}
    </span>
  );
}
