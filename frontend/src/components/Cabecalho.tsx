/**
 * Cabeçalho de etapa: sobrelinha, trilha das quatro etapas, título e resumo.
 *
 * A trilha é decorativa — o número da etapa vem escrito na sobrelinha, para
 * quem usa leitor de tela não depender do desenho.
 */
export function Cabecalho({
  titulo,
  descricao,
  passo,
  etapaAtual,
}: {
  titulo: string;
  descricao: string;
  passo: string;
  /** 1 a 4. Sem isso, a trilha não é desenhada. */
  etapaAtual?: number;
}) {
  return (
    <>
      {/* Trilha de navegação no topo: dá respiro antes do título e diz onde
          se está, sem repetir o que a barra lateral já mostra. */}
      <nav
        aria-label="Trilha de navegação"
        className="flex h-[3.875rem] items-center gap-3 border-b border-[var(--border)] text-xs text-muted"
      >
        <span>Análise do caso</span>
        <span aria-hidden="true" className="text-[#75877c]">
          /
        </span>
        <span className="text-foreground">{titulo}</span>
      </nav>

      <header className="max-w-[55rem] pb-6 pt-7">
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
      </header>
    </>
  );
}
