import type { ReactNode } from "react";
import {
  IconeAchados, IconeConferencia, IconeDossie, IconeUpload,
} from "./Icones.tsx";

export type EtapaId = "documentos" | "conferencia" | "achados" | "dossie";

export const ETAPAS = [
  { id: "documentos", rotulo: "Documentos", resumo: "Peças do caso", Icone: IconeUpload },
  { id: "conferencia", rotulo: "Conferência", resumo: "Medicamento e posologia", Icone: IconeConferencia },
  { id: "achados", rotulo: "Achados", resumo: "Rota e requisitos", Icone: IconeAchados },
  { id: "dossie", rotulo: "Dossiê", resumo: "Minutas e pendências", Icone: IconeDossie },
] as const satisfies readonly {
  id: EtapaId; rotulo: string; resumo: string; Icone: unknown;
}[];

interface Props {
  etapa: EtapaId;
  liberadas: Set<EtapaId>;
  onIr: (etapa: EtapaId) => void;
  children: ReactNode;
}

/**
 * Barra lateral em verde suave sobre o fundo cinza da página, com a marca no
 * topo e as quatro etapas. A etapa atual recebe o gradiente de ação — com
 * texto escuro, porque o verde da marca nunca carrega texto branco.
 *
 * Em tela estreita vira uma faixa horizontal de quatro colunas, preservando a
 * ordem de leitura.
 */
export function Shell({ etapa, liberadas, onIr, children }: Props) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--foreground)] focus:px-5 focus:py-3 focus:text-white"
        href="#conteudo"
      >
        Pular para o conteúdo
      </a>

      <aside
        aria-label="Etapas da análise"
        className="sticky top-0 z-10 flex flex-col border-b border-[var(--sidebar-border)] bg-[var(--sidebar)] px-4 py-4 lg:h-dvh lg:border-b-0 lg:border-e lg:px-4 lg:pb-6 lg:pt-8"
      >
        <div className="flex items-center gap-2.5 px-1 lg:px-3">
          <span className="gradiente-marca size-7 rounded-[0.5625rem]" />
          <span className="fonte-display text-[1.6rem] font-bold tracking-[-0.08rem]">
            juscare
          </span>
        </div>

        <p className="sidebar-rotulo mt-10 hidden px-3 text-[0.625rem] font-bold tracking-[0.1rem] text-muted lg:block">
          ANÁLISE DO CASO
        </p>

        <ol className="mt-4 grid grid-cols-4 gap-1 lg:mt-4 lg:grid-cols-1 lg:gap-2.5">
          {ETAPAS.map((e, i) => {
            const ativa = e.id === etapa;
            const disponivel = liberadas.has(e.id);
            return (
              <li key={e.id} className="min-w-0">
                <button
                  aria-current={ativa ? "step" : undefined}
                  className={`flex w-full flex-col items-center gap-1 rounded-[0.5625rem] px-1 py-2 text-center transition-colors lg:min-h-[4.25rem] lg:flex-row lg:items-center lg:gap-2.5 lg:rounded-[0.8125rem] lg:px-3 lg:text-left
                    ${ativa
                      ? "gradiente-acao shadow-[0_5px_16px_rgba(0,165,99,0.13)]"
                      : "hover:bg-[var(--sidebar-hover)]"}
                    ${disponivel ? "" : "cursor-not-allowed opacity-50"}`}
                  disabled={!disponivel}
                  type="button"
                  onClick={() => onIr(e.id)}
                >
                  <e.Icone className="size-[1.0625rem] shrink-0 lg:size-5" />
                  <span className="min-w-0 lg:flex-1">
                    <span className="fonte-display block text-[0.625rem] font-bold leading-tight lg:text-sm">
                      {e.rotulo}
                    </span>
                    <span className="mt-0.5 hidden text-[0.625rem] leading-[1.4] text-[#40554a] lg:block">
                      {e.resumo}
                    </span>
                  </span>
                  <span className="num hidden self-start pt-0.5 text-[0.6875rem] text-[#40554a] lg:inline">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <p className="mt-auto hidden px-3 pt-6 text-[0.6875rem] leading-relaxed text-muted lg:block">
          <strong className="mb-1 block text-xs text-foreground">
            Ferramenta de apoio à triagem
          </strong>
          As saídas são minutas revisáveis e não substituem a conferência do
          advogado responsável.
        </p>
      </aside>

      <main className="mx-auto w-full max-w-[77.5rem] px-4 pb-6 lg:px-9 lg:pb-8" id="conteudo">
        {children}
      </main>
    </div>
  );
}
