import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { IconeCalculadora, IconeChevron, IconeEscudo, IconeInfo } from "./Icones.tsx";
import { api, type PontoDeIA } from "../lib/api.ts";

/**
 * Ajuda contextual sobre onde a IA atua — feita para auditoria.
 *
 * Três compromissos, todos verificáveis no código:
 *
 * 1. Abrir a ajuda NÃO chama o modelo e NÃO altera o caso. O catálogo é lido
 *    uma vez por sessão, de uma rota que só inspeciona o código.
 * 2. O template exibido é montado pelas mesmas funções que montam o prompt
 *    real, com placeholders no lugar dos documentos. Não há dado de paciente.
 * 3. Ponto determinístico é rotulado como tal. Chamar cálculo de "IA" seria
 *    mentir para quem audita, e o contrário também.
 */

const Contexto = createContext<Map<string, PontoDeIA> | null>(null);

export function ProvedorDeAjuda({ children }: { children: ReactNode }) {
  const [pontos, setPontos] = useState<Map<string, PontoDeIA> | null>(null);

  useEffect(() => {
    api
      .pontosDeIA()
      .then((r) => setPontos(new Map(r.pontos.map((p) => [p.id, p]))))
      .catch(() => setPontos(new Map()));
  }, []);

  return <Contexto.Provider value={pontos}>{children}</Contexto.Provider>;
}

/** Catálogo inteiro, para a tela Sobre nós. `null` enquanto carrega. */
export function usePontosDeIA() {
  return useContext(Contexto);
}

export const ROTULO: Record<PontoDeIA["natureza"], { texto: string; Icone: typeof IconeInfo }> = {
  ia: { texto: "Modelo de linguagem", Icone: IconeInfo },
  deterministico: { texto: "Regra determinística", Icone: IconeCalculadora },
  modelo_local: { texto: "Modelo local, na nossa infraestrutura", Icone: IconeEscudo },
};

/**
 * @param ponto id no catálogo (`tema6`, `dossie`, `rota`, ...).
 * @param rotulo nome acessível do acionador — específico, não "saiba mais".
 * @param destaque trecho do template aplicável a este item, quando a mesma
 *   chamada produz vários (os seis requisitos, as cinco peças).
 */
export function AjudaIA({
  ponto,
  rotulo,
  destaque,
}: {
  ponto: string;
  rotulo: string;
  destaque?: string;
}) {
  const catalogo = useContext(Contexto);
  const dados = catalogo?.get(ponto);
  if (!catalogo) return null;

  if (!dados) {
    return (
      <span className="text-[0.6875rem] text-muted">
        Prompt não localizado no código disponível.
      </span>
    );
  }

  const { texto: naturezaTexto, Icone } = ROTULO[dados.natureza];
  const ehIA = dados.natureza === "ia";

  return (
    <details className="ajuda-ia group/ajuda">
      <summary
        aria-label={rotulo}
        className="controle inline-flex cursor-pointer list-none items-center gap-1.5 rounded-[0.5625rem] border border-[#c9dbd0] bg-[#edf4ef] px-2.5 py-1 text-[0.6875rem] font-medium text-[#255d3d]"
      >
        <Icone className="size-4 shrink-0" />
        <span>{ehIA ? "Como a IA atua aqui" : naturezaTexto}</span>
        <IconeChevron className="size-3.5 transition-transform group-open/ajuda:rotate-180" />
      </summary>

      <div className="mt-3 rounded-[0.5625rem] border border-[var(--border)] bg-[var(--surface-secondary)] p-4 text-[0.8125rem] leading-relaxed">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-[0.375rem] border border-[#d7ded9] bg-[#eef1ef] px-2 py-1 text-[0.6875rem] text-[#536259]">
          <Icone className="size-3.5" />
          {naturezaTexto}
          {dados.versao && ` · versão ${dados.versao}`}
          {dados.modelo && ` · ${dados.modelo}`}
        </p>

        {destaque && (
          <p className="mb-3 rounded-[0.375rem] border border-[#c8e5d2] bg-[var(--status-ok-bg)] px-3 py-2 text-[0.75rem] text-[var(--status-ok-fg)]">
            <strong className="font-semibold">Aplicável a este item: </strong>
            {destaque}
          </p>
        )}

        <dl className="grid gap-0">
          <Secao titulo="O que acontece aqui">{dados.oQueFaz}</Secao>
          <Secao titulo={ehIA ? "Por que há um prompt" : "Por que não usa modelo"}>
            {dados.porQue}
          </Secao>
          <Secao titulo="Entradas utilizadas">
            <ul className="list-inside list-disc">
              {dados.entradas.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Secao>

          {dados.sistema && (
            <Secao titulo="Instrução de sistema">
              <Bloco texto={dados.sistema} />
            </Secao>
          )}

          {dados.template && (
            <Secao titulo="Template da mensagem">
              <p className="mb-2 text-xs text-muted">
                Template atual da aplicação, com placeholders no lugar dos
                documentos. Origem: <code>{dados.arquivo}</code>
              </p>
              <Bloco texto={dados.template} />
            </Secao>
          )}

          {dados.blocos && (
            <Secao titulo="Como ler cada bloco">
              <ul className="flex flex-col gap-2">
                {dados.blocos.map((b) => (
                  <li key={b.trecho}>
                    <code className="rounded bg-[#eef3ef] px-1 py-0.5 text-xs">
                      {b.trecho}
                    </code>
                    <span className="block text-[0.8125rem]">{b.explicacao}</span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {!dados.template && !dados.sistema && (
            <Secao titulo="Prompt">Não há prompt: este ponto não chama modelo de linguagem.</Secao>
          )}

          <Secao titulo="Saída e onde ela aparece">{dados.saida}</Secao>
          <Secao titulo="Limites e revisão humana">{dados.limites}</Secao>
          <Secao titulo="Origem no repositório">
            <code className="text-xs">{dados.arquivo}</code>
          </Secao>
        </dl>
      </div>
    </details>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <dt className="fonte-display mt-4 text-[0.8125rem] font-bold first:mt-0">
        {titulo}
      </dt>
      <dd className="mt-1.5 text-[0.8125rem] leading-relaxed text-[#344e3e]">
        {children}
      </dd>
    </>
  );
}

/* Texto escapado, nunca HTML: o template é conteúdo, não marcação. */
function Bloco({ texto }: { texto: string }) {
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-[0.5625rem] border border-[var(--border)] bg-[#f2f5f3] p-4 font-mono text-[0.75rem] leading-[1.8]">
      {texto}
    </pre>
  );
}
