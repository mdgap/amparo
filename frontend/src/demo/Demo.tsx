import { useLayoutEffect, useRef } from "react";
import { CENARIOS, type Cenario } from "./cenarios.ts";
import type { Simulacao } from "./api.ts";

export function BarraDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const atualizar = () => document.documentElement.style.setProperty("--demo-bar-height", `${ref.current!.getBoundingClientRect().height}px`);
    atualizar();
    const observer = new ResizeObserver(atualizar);
    observer.observe(ref.current!);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--demo-bar-height"); };
  }, []);
  return (
    <div ref={ref} className="demo-barra sticky top-0 z-30 overflow-x-auto whitespace-nowrap bg-[#ed1c24] px-4 py-2 text-center text-xs leading-tight text-white" aria-label="Aviso de demonstração">
      <strong>Demo (POC):</strong> casos, documentos e respostas simulados. Versão oficial:{" "}
      <a className="break-all font-semibold underline underline-offset-4" href="mailto:oi@paulojalowyj.com">oi@paulojalowyj.com</a>
    </div>
  );
}

export function ControlesDemo({ cenario, modo, ocupado, onCenario, onModo, onReiniciar }: {
  cenario: Cenario; modo: Simulacao; ocupado: boolean;
  onCenario: (c: Cenario) => void; onModo: (m: Simulacao) => void; onReiniciar: () => void;
}) {
  return (
    <section aria-label="Controles da demonstração" className="mt-6 rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-0 flex-1 text-xs font-medium" htmlFor="demo-cenario">
          Cenário fictício
          <select id="demo-cenario" className="controle mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm" value={cenario.id} disabled={ocupado} onChange={(e) => onCenario(CENARIOS.find((c) => c.id === e.target.value)!)}>
            {CENARIOS.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs font-medium" htmlFor="demo-modo">
          Comportamento da próxima análise
          <select id="demo-modo" className="controle mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm" value={modo} disabled={ocupado} onChange={(e) => onModo(e.target.value as Simulacao)}>
            <option value="normal">Simulação normal</option>
            <option value="falha">Falha recuperável (uma tentativa)</option>
            <option value="sem-ia">IA indisponível (somente cálculo)</option>
          </select>
        </label>
        <button type="button" className="controle rounded-lg border border-[var(--border)] px-4 text-sm disabled:opacity-50" disabled={ocupado} onClick={onReiniciar}>Reiniciar demonstração</button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted" role="status">
        {cenario.descricao} As consultas são locais e a análise leva cerca de dez segundos. Edite os números para experimentar o cálculo; documentos alterados ficam sem análise. Recarregar a página restaura os exemplos.
      </p>
    </section>
  );
}

export function GaleriaDemo({ onSimular, onResultado }: { onSimular: (c: Cenario) => void; onResultado: (c: Cenario) => void }) {
  const trilho = useRef<HTMLDivElement>(null);
  const mover = (direcao: -1 | 1) => trilho.current?.scrollBy({ left: direcao * Math.min(420, trilho.current.clientWidth * 0.8), behavior: "smooth" });

  return (
    <section className="mt-6" aria-label="Cenários fictícios disponíveis">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="fonte-display text-xl font-bold">Explore os seis cenários</h2>
          <p className="mt-2 text-sm text-muted">Abra um resultado preparado ou percorra a experiência desde os documentos.</p>
        </div>
        <div className="flex shrink-0 gap-2" aria-label="Navegação dos cenários">
          <button type="button" className="controle size-10 rounded-full border border-[var(--border)] text-lg" onClick={() => mover(-1)} aria-label="Cenário anterior">←</button>
          <button type="button" className="controle size-10 rounded-full border border-[var(--border)] text-lg" onClick={() => mover(1)} aria-label="Próximo cenário">→</button>
        </div>
      </div>
      <div ref={trilho} className="demo-carrossel mt-4 mb-7 flex gap-3 overflow-x-auto" tabIndex={0}>
        {CENARIOS.map((c) => (
          <article key={c.id} className="cartao flex w-[min(82vw,360px)] shrink-0 snap-start flex-col p-5">
            <h3 className="fonte-display font-bold">{c.titulo}</h3>
            <p className="mt-2 flex-1 text-sm text-muted">{c.descricao}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="controle rounded-lg bg-accent px-3 text-sm text-accent-foreground" onClick={() => onSimular(c)} aria-label={`Simular: ${c.titulo}`}>Simular este caso</button>
              <button type="button" className="controle rounded-lg border border-[var(--border)] px-3 text-sm" onClick={() => onResultado(c)} aria-label={`Ver resultado: ${c.titulo}`}>Ver resultado</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
