import { useState } from "react";
import { Alert, Button } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { IconeDossie, IconeOk } from "../components/Icones.tsx";
import { AjudaIA } from "../components/AjudaIA.tsx";
import { Fontes } from "../components/Fontes.tsx";
import type { Dossie, Fonte } from "../lib/api.ts";

const PECAS = [
  { id: "memorandoDeRota", titulo: "Memorando de rota" },
  { id: "requerimentoAdministrativo", titulo: "Requerimento administrativo" },
  { id: "resumoDeEvidencia", titulo: "Resumo de evidência" },
  { id: "trechoDePeticao", titulo: "Trecho de petição" },
] as const;

type PecaId = (typeof PECAS)[number]["id"];

/**
 * As cinco peças saem de UMA chamada só. A ajuda mostra o prompt compartilhado
 * e destaca o item da tarefa que produz a peça consultada.
 */
const DESTAQUE_POR_PECA: Record<PecaId | "pendencias", string> = {
  memorandoDeRota:
    "Item 1 da tarefa: memorando interno explicando foro, polo passivo e a memória de cálculo, com as fontes citadas.",
  requerimentoAdministrativo:
    "Item 2 da tarefa: minuta de requerimento à secretaria de saúde, com [NOME], [CPF] e [ENDEREÇO] como lacunas: dado de paciente não entra.",
  resumoDeEvidencia:
    "Item 3 da tarefa: o que os documentos do caso já provam, requisito a requisito.",
  trechoDePeticao:
    "Item 5 da tarefa: trecho de petição sobre competência e cabimento, apenas essa parte, não a petição inteira.",
  pendencias:
    "Item 4 da tarefa: lista objetiva do que pedir ao cliente, em ordem de urgência. As pendências apuradas em código entram no prompt como insumo.",
};

export function DossieEtapa({
  dossie,
  aptoParaProtocolo,
  fontes,
  onVoltar,
}: {
  dossie: Dossie;
  aptoParaProtocolo: boolean;
  /** As mesmas da análise: é aqui que os [F1], [F2] das minutas aparecem. */
  fontes: Fonte[];
  onVoltar: () => void;
}) {
  const [peca, setPeca] = useState<PecaId>("memorandoDeRota");
  const [copiada, setCopiada] = useState<string | null>(null);

  async function copiar(texto: string, id: string) {
    await navigator.clipboard.writeText(texto);
    setCopiada(id);
    setTimeout(() => setCopiada(null), 2000);
  }

  return (
    <>
      <Cabecalho
        descricao="Minutas geradas a partir do corpus oficial. Cada citação precisa ser conferida antes do uso."
        passo="Etapa 4 de 4"
        etapaAtual={4}
        titulo="Dossiê do caso"
      />

      {!aptoParaProtocolo && (
        <Alert className="mb-6" status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Caso ainda não está pronto para protocolo</Alert.Title>
            <Alert.Description>
              Há requisitos do Tema 6 sem comprovação. Use o requerimento
              administrativo e a lista de pendências antes de ajuizar.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="gap-[1.375rem] lg:grid lg:grid-cols-[14.125rem_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Peças do dossiê"
          className="mb-4 lg:sticky lg:top-5 lg:mb-0"
        >
          <p className="mb-1 hidden text-[0.625rem] font-bold tracking-[0.1rem] text-muted lg:block">
            PEÇAS DO DOSSIÊ
          </p>
          <ul className="grid grid-cols-2 gap-2 lg:flex lg:flex-col">
            {PECAS.map((p) => (
              <li key={p.id} className="shrink-0 lg:w-full">
                <button
                  aria-current={peca === p.id ? "true" : undefined}
                  className={`flex min-h-[3.375rem] w-full items-center gap-2.5 rounded-[0.625rem] border px-3 py-3 text-start text-xs transition-colors
                    ${peca === p.id
                      ? "gradiente-acao border-[#13ac6c]"
                      : "border-[#cddad2] bg-surface hover:border-[#3c8860] hover:bg-[#eff6f1]"}`}
                  type="button"
                  onClick={() => setPeca(p.id)}
                >
                  <IconeDossie className="size-[1.0625rem] shrink-0" />
                  {p.titulo}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article className="rounded-2xl border border-[var(--border)] bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-t-2xl border-b border-[#d7e2db] bg-[#fafcfb] px-[1.625rem] py-[1.375rem]">
            <div>
              <p className="mb-1.5 text-[0.625rem] tracking-[0.07rem] text-[#496753]">
                MINUTA REVISÁVEL
              </p>
              <h2 className="fonte-display text-xl font-bold">
                {PECAS.find((p) => p.id === peca)?.titulo}
              </h2>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => void copiar(dossie[peca], peca)}
            >
              {copiada === peca ? (
                <>
                  <IconeOk className="size-4" />
                  Copiado
                </>
              ) : (
                "Copiar texto"
              )}
            </Button>
          </header>
          <div className="px-[1.875rem] pb-7 pt-2">
            <p className="max-w-[78ch] whitespace-pre-wrap text-sm leading-[1.85] text-[#264230]">
              {dossie[peca]}
            </p>
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <AjudaIA
                destaque={DESTAQUE_POR_PECA[peca]}
                ponto="dossie"
                rotulo={`Como a IA redige ${PECAS.find((p) => p.id === peca)?.titulo}`}
              />
            </div>
          </div>
        </article>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="fonte-display text-lg font-bold">Pendências do cliente</h2>
          <AjudaIA
            destaque={DESTAQUE_POR_PECA.pendencias}
            ponto="dossie"
            rotulo="Como a IA monta a lista de pendências"
          />
        </div>
        {dossie.pendenciasDoCliente.length === 0 ? (
          <p className="text-muted">Nenhuma pendência registrada.</p>
        ) : (
          <ol className="flex list-inside list-decimal flex-col gap-2">
            {dossie.pendenciasDoCliente.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        )}
      </section>

      {/* As minutas acima citam [F1], [F2]. A legenda tem de estar na mesma
          tela, ou o marcador fica sem como ser resolvido por quem lê a peça. */}
      {fontes.length > 0 && <Fontes fontes={fontes} />}

      <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
        <Button className="controle" variant="secondary" onPress={onVoltar}>
          Voltar aos achados
        </Button>
      </div>
    </>
  );
}
