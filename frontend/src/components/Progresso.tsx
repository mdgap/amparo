import { Spinner } from "@heroui/react";
import { IconeOk } from "./Icones.tsx";
import { PASSOS_DA_ANALISE, type Passo, type PassoId } from "../lib/api.ts";
import { DEMO } from "../demo/ativo.ts";

/**
 * O que está acontecendo durante os quase dois minutos de análise.
 *
 * Cada passo mostra o que faz enquanto roda e o que produziu quando termina —
 * é o que transforma espera em explicação, e é onde a anonimização fica
 * visível para quem confia o documento à ferramenta.
 */
export function Progresso({ passos }: { passos: Map<PassoId, Passo> }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
      <h2 className="fonte-display mb-5 text-lg font-semibold">{DEMO ? "Simulando a análise" : "Analisando o caso"}</h2>

      <ol className="flex flex-col gap-4">
        {PASSOS_DA_ANALISE.map((passo) => {
          const estado = passos.get(passo.id)?.estado;
          const detalhe = passos.get(passo.id)?.detalhe;
          const feito = estado === "feito";
          const fazendo = estado === "fazendo";

          return (
            <li
              key={passo.id}
              className={`flex gap-3 ${estado ? "" : "opacity-40"}`}
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                {feito ? (
                  <IconeOk className="size-5 text-[var(--status-ok-fg)]" />
                ) : fazendo ? (
                  <Spinner size="sm" />
                ) : (
                  <span className="size-2 rounded-full bg-[var(--border)]" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className={`text-base ${fazendo ? "font-semibold" : "font-medium"}`}>
                  {passo.titulo}
                </p>
                {/* Enquanto roda, explica o que está fazendo; depois, o que deu. */}
                {fazendo && (
                  <p className="mt-1 text-sm text-muted">{DEMO ? "Espera demonstrativa. Nenhum modelo ou serviço externo está sendo chamado." : passo.enquanto}</p>
                )}
                {feito && detalhe && (
                  <p className="num mt-1 text-sm text-muted">{detalhe}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm text-muted">
        {DEMO ? "O tempo de espera demonstra os estados da interface. As respostas são locais; a duração não mede o desempenho da ferramenta oficial." : <>As duas etapas de leitura e redação passam por um modelo de linguagem e
        levam cerca de 40 segundos cada. Foro, custo e placar são calculados em
        código.
        </>}
      </p>
    </section>
  );
}
