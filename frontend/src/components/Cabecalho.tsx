import type { ReactNode } from "react";

/**
 * Cabeçalho de etapa: sobrelinha, trilha das quatro etapas, título e resumo.
 *
 * A trilha é decorativa — o número da etapa vem escrito na sobrelinha, para
 * quem usa leitor de tela não depender do desenho.
 *
 * Devolve dois blocos irmãos (trilha e cabeçalho) e por isso não deve ser
 * embrulhado num flex junto de outros elementos: uma ação ao lado do título
 * entra pela propriedade `acao`.
 */
export function Cabecalho({
  titulo,
  descricao,
  passo,
  etapaAtual,
  secao = "Análise do caso",
  acao,
}: {
  titulo: string;
  descricao: string;
  passo: string;
  /** 1 a 4. Sem isso, a trilha não é desenhada. */
  etapaAtual?: number;
  /**
   * Primeiro nível da trilha. `null` em tela raiz, como o painel: não há
   * trilha, porque ela só repetiria o título logo abaixo.
   */
  secao?: string | null;
  /** Ação principal da tela, alinhada à direita do título. */
  acao?: ReactNode;
}) {
  return (
    <>
      {/* Trilha de navegação no topo: dá respiro antes do título e diz onde
          se está, sem repetir o que a barra lateral já mostra. */}
      {secao !== null && (
        <nav
          aria-label="Trilha de navegação"
          className="flex h-[3.875rem] items-center gap-3 border-b border-[var(--border)] text-xs text-muted"
        >
          <span>{secao}</span>
          <span aria-hidden="true" className="text-[#75877c]">
            /
          </span>
          <span className="text-foreground">{titulo}</span>
        </nav>
      )}

      {/* Sem trilha, o topo soma a altura dela: o título fica na mesma linha
          das outras telas. */}
      <header
        className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 ${
          secao === null ? "pt-[5.625rem]" : "pt-7"
        }`}
      >
        <div className="max-w-[55rem]">
          <div className="mb-3 flex items-center gap-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.0625rem] text-[#356149]">
              {passo}
            </p>
            {etapaAtual && (
              <div aria-hidden="true" className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className={`trilha-etapa ${n === etapaAtual ? "atual" : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
          <h1 className="fonte-display text-[2.25rem] font-bold leading-[1.18] tracking-[-0.075rem]">
            {titulo}
          </h1>
          <p className="mt-2.5 max-w-[50rem] text-sm leading-[1.65] text-muted">
            {descricao}
          </p>
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </header>
    </>
  );
}
