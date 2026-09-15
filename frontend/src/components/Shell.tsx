import type { ReactNode } from "react";
import {
  IconeAchados, IconeBalanca, IconeConferencia, IconeDossie, IconeInfo, IconeTrofeu, IconeUpload,
} from "./Icones.tsx";

/**
 * "painel" é a tela inicial e "sobre" explica o projeto; as outras quatro são
 * as etapas numeradas da análise.
 */
export type EtapaId = "painel" | "sobre" | "hackathon" | "documentos" | "conferencia" | "achados" | "dossie";

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
  bloqueada?: boolean;
}

/**
 * Barra lateral em verde suave sobre o fundo cinza da página, com a marca no
 * topo e as quatro etapas. A etapa atual recebe o gradiente de ação — com
 * texto escuro, porque o verde da marca nunca carrega texto branco.
 *
 * Em tela estreita vira uma faixa horizontal de quatro colunas, preservando a
 * ordem de leitura.
 */
export function Shell({ etapa, liberadas, onIr, children, bloqueada = false }: Props) {
  const informativa = etapa === "hackathon" || etapa === "sobre";

  return (
    <div className={`min-h-dvh lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)] ${informativa ? "" : "pb-[4.75rem] lg:pb-0"}`}>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[var(--foreground)] focus:px-5 focus:py-3 focus:text-white"
        href="#conteudo"
      >
        Pular para o conteúdo
      </a>

      <aside
        aria-label="Etapas da análise"
        className="sticky top-0 z-10 grid grid-cols-[1fr_auto_auto_auto] items-center gap-1 border-b border-[var(--sidebar-border)] bg-[var(--sidebar)] px-3 py-2 lg:flex lg:h-dvh lg:flex-col lg:items-stretch lg:border-b-0 lg:border-e lg:px-4 lg:pb-6 lg:pt-8"
      >
        {/* Logo escura: a lateral é clara. A versão clara fica em public/ para
            superfícies escuras. */}
        <button
          aria-label="Amparo: voltar ao Painel de casos"
          className="self-start rounded-lg px-1 lg:px-3"
          type="button"
          disabled={bloqueada}
          onClick={() => onIr("painel")}
        >
          <img
            alt=""
            className="h-7 w-auto lg:h-9"
            height={548}
            src="/amparo_logo_escura.png"
            width={2048}
          />
        </button>

        <button
          aria-current={etapa === "painel" ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-[0.5625rem] px-2 py-2 text-left transition-colors lg:mt-8 lg:min-h-[3rem] lg:gap-2.5 lg:rounded-[0.8125rem] lg:px-3
            ${etapa === "painel"
              ? "gradiente-acao shadow-[0_5px_16px_rgba(0,165,99,0.13)]"
              : "hover:bg-[var(--sidebar-hover)]"}`}
          type="button"
          disabled={bloqueada}
          onClick={() => onIr("painel")}
        >
          <IconeBalanca className="size-[1.0625rem] shrink-0 lg:size-5" />
          <span className="fonte-display text-xs font-bold"><span className="lg:hidden">Painel</span><span className="hidden lg:inline">Painel de casos</span></span>
        </button>

        <p className="sidebar-rotulo mt-8 hidden px-3 text-[0.625rem] font-bold tracking-[0.1rem] text-muted lg:block">
          ANÁLISE DO CASO
        </p>

        <ol className={`${informativa ? "hidden lg:grid" : "fixed inset-x-0 bottom-0 z-20 grid"} grid-cols-4 gap-1 border-t border-[var(--sidebar-border)] bg-[var(--sidebar)] px-2 py-1.5 lg:static lg:mt-4 lg:w-full lg:grid-cols-1 lg:gap-2.5 lg:border-0 lg:bg-transparent lg:p-0`}>
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
                  disabled={!disponivel || bloqueada}
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

        <div className="contents lg:mt-auto lg:flex lg:flex-col lg:gap-1">
          <button
            aria-current={etapa === "hackathon" ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-[0.5625rem] px-2 py-2 text-left transition-colors lg:gap-2.5 lg:rounded-[0.8125rem] lg:px-3 lg:py-3
              ${etapa === "hackathon"
                ? "gradiente-acao shadow-[0_5px_16px_rgba(0,165,99,0.13)]"
                : "hover:bg-[var(--sidebar-hover)]"}`}
            type="button"
            disabled={bloqueada}
            onClick={() => onIr("hackathon")}
          >
            <IconeTrofeu className="size-[1.0625rem] shrink-0 lg:size-5" />
            <span className="min-w-0">
              <span className="fonte-display block text-xs font-bold lg:text-sm">O Hackathon</span>
              <span className="hidden text-[0.6875rem] leading-snug text-[#40554a] lg:block">Nossa equipe e a conquista</span>
            </span>
          </button>

          <button
          aria-current={etapa === "sobre" ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-[0.5625rem] px-2 py-2 text-left transition-colors lg:gap-2.5 lg:rounded-[0.8125rem] lg:px-3 lg:py-3
            ${etapa === "sobre"
              ? "gradiente-acao shadow-[0_5px_16px_rgba(0,165,99,0.13)]"
              : "hover:bg-[var(--sidebar-hover)]"}`}
          type="button"
          disabled={bloqueada}
          onClick={() => onIr("sobre")}
        >
          <IconeInfo className="size-[1.0625rem] shrink-0 lg:size-5" />
          <span className="min-w-0">
            <span className="fonte-display block text-xs font-bold lg:text-sm">Sobre nós</span>
            <span className="hidden text-[0.6875rem] leading-snug text-[#40554a] lg:block">
              Como o projeto funciona
            </span>
          </span>
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-[77.5rem] px-4 pb-6 lg:px-9 lg:pb-8" id="conteudo">
        {children}
      </main>
    </div>
  );
}
