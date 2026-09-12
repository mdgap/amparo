import { useState } from "react";
import { Alert, Button } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { IconeOk } from "../components/Icones.tsx";
import type { Dossie } from "../lib/api.ts";

const PECAS = [
  { id: "memorandoDeRota", titulo: "Memorando de rota" },
  { id: "requerimentoAdministrativo", titulo: "Requerimento administrativo" },
  { id: "resumoDeEvidencia", titulo: "Resumo de evidência" },
  { id: "trechoDePeticao", titulo: "Trecho de petição" },
] as const;

type PecaId = (typeof PECAS)[number]["id"];

export function DossieEtapa({
  dossie,
  aptoParaProtocolo,
  onVoltar,
}: {
  dossie: Dossie;
  aptoParaProtocolo: boolean;
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

      <div className="gap-6 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start">
        <nav aria-label="Peças do dossiê" className="mb-4 lg:mb-0">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col">
            {PECAS.map((p) => (
              <li key={p.id} className="shrink-0 lg:w-full">
                <button
                  aria-current={peca === p.id ? "true" : undefined}
                  className={`controle w-full rounded-xl border px-4 text-start text-sm font-medium
                    ${peca === p.id
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-[var(--border)] bg-surface text-foreground"}`}
                  type="button"
                  onClick={() => setPeca(p.id)}
                >
                  {p.titulo}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article className="rounded-2xl border border-[var(--border)] bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
            <h2 className="fonte-display text-lg font-semibold">
              {PECAS.find((p) => p.id === peca)?.titulo}
            </h2>
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
          <div className="px-6 py-6">
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {dossie[peca]}
            </p>
          </div>
        </article>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-surface p-6">
        <h2 className="fonte-display mb-4 text-lg font-semibold">
          Pendências do cliente
        </h2>
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

      <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
        <Button className="controle" variant="secondary" onPress={onVoltar}>
          Voltar aos achados
        </Button>
      </div>
    </>
  );
}
