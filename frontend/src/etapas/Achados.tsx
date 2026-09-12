import { useState } from "react";
import { Alert, Button } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { Estado } from "../components/Estado.tsx";
import { IconeBalanca, IconeChevron, IconeDocumento, IconeOk, IconeSeta } from "../components/Icones.tsx";
import { brl, type Analise, type RequisitoTema6, type StatusRequisito } from "../lib/api.ts";
import { CAMPOS_DOCUMENTO, type Documentos } from "../lib/caso.ts";

interface Props {
  analise: Analise;
  catalogo: RequisitoTema6[];
  documentos: Documentos;
  onVoltar: () => void;
  onVerDossie: () => void;
}

export function Achados({ analise, catalogo, documentos, onVoltar, onVerDossie }: Props) {
  const [painel, setPainel] = useState<"achados" | "documento">("achados");
  const { rota, tema6 } = analise;

  const pendentes = tema6
    ? tema6.resumo.total - tema6.resumo.ok
    : catalogo.length;

  return (
    <>
      <Cabecalho
        descricao={
          tema6
            ? `${pendentes} ponto(s) precisam de atenção antes do protocolo. Cada achado traz o trecho do documento, a fonte e a próxima ação.`
            : "O motor de regras foi executado. A leitura dos documentos exige a etapa de IA, que está desligada."
        }
        passo="Etapa 3 de 4"
        titulo="Achados da análise"
      />

      <RotaResumo rota={rota} />

      {analise.anonimizacao && analise.anonimizacao.total > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <IconeOk className="size-4 shrink-0 text-[var(--status-ok-fg)]" />
          <span>
            Antes da análise, {analise.anonimizacao.total} dado(s) pessoal(is)
            foram substituídos por marcador:{" "}
            {Object.entries(analise.anonimizacao.removidos)
              .map(([marcador, n]) => `${n}× ${marcador}`)
              .join(", ")}
            . O modelo não recebeu nome, documento nem contato.
          </span>
        </p>
      )}

      {analise.aviso && (
        <Alert className="mt-6" status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Leitura dos documentos indisponível</Alert.Title>
            <Alert.Description>{analise.aviso}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {tema6?.alertaENatJus && (
        <Alert className="mt-6" status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Divergência com a nota do e-NatJus</Alert.Title>
            <Alert.Description>{tema6.alertaENatJus}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Alternância entre achados e documento em telas estreitas */}
      <div className="mt-8 flex gap-2 lg:hidden" role="tablist">
        {(["achados", "documento"] as const).map((id) => (
          <button
            key={id}
            aria-selected={painel === id}
            className={`controle flex-1 rounded-xl border px-4 text-sm font-medium capitalize
              ${painel === id
                ? "border-transparent bg-accent text-accent-foreground"
                : "border-[var(--border)] bg-surface text-foreground"}`}
            role="tab"
            type="button"
            onClick={() => setPainel(id)}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="mt-6 gap-6 lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <section
          aria-label="Achados"
          className={painel === "achados" ? "flex flex-col gap-3" : "hidden lg:flex lg:flex-col lg:gap-3"}
        >
          {tema6
            ? catalogo.map((req) => {
                const av = tema6.avaliacoes.find((a) => a.id === req.id);
                return (
                  <Achado
                    key={req.id}
                    acao={
                      av?.status === "ok"
                        ? "Nenhuma providência pendente. Confirme a peça no dossiê."
                        : (av?.pendencia ?? req.comoComprovar)
                    }
                    evidencias={av?.evidencias ?? []}
                    fonte={req.fonte}
                    resumo={av?.justificativa ?? req.descricao}
                    status={av?.status ?? "nao_avaliado"}
                    titulo={req.titulo}
                  />
                );
              })
            : catalogo.map((req) => (
                <Achado
                  key={req.id}
                  acao={req.comoComprovar}
                  evidencias={[]}
                  fonte={req.fonte}
                  resumo={req.descricao}
                  status="nao_avaliado"
                  titulo={req.titulo}
                />
              ))}
        </section>

        <section
          aria-label="Documento"
          className={painel === "documento" ? "lg:sticky lg:top-10" : "hidden lg:block lg:sticky lg:top-10"}
        >
          <div className="rounded-2xl border border-[var(--border)] bg-surface">
            <h2 className="fonte-display flex items-center gap-2 border-b border-[var(--border)] px-6 py-4 text-lg font-semibold">
              <IconeDocumento className="size-5" />
              Documentos do caso
            </h2>
            <div className="max-h-[32rem] overflow-y-auto px-6 py-5">
              {CAMPOS_DOCUMENTO.filter((c) => documentos[c.id].trim()).map((c) => (
                <article key={c.id} className="mb-6 last:mb-0">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                    {c.rotulo}
                  </h3>
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {documentos[c.id]}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
        <Button className="controle" isDisabled={!analise.dossie} onPress={onVerDossie}>
          Ver dossiê
          <IconeSeta className="size-5" />
        </Button>
        <Button className="controle" variant="secondary" onPress={onVoltar}>
          Rever informações
        </Button>
      </div>
    </>
  );
}

function RotaResumo({ rota }: { rota: Analise["rota"] }) {
  const metricas = [
    { rotulo: "Custo anual", valor: brl(rota.custo.custoAnual) },
    {
      rotulo: "Em salários mínimos",
      valor: `${rota.custo.emSalariosMinimos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} SM`,
    },
    { rotulo: "Teto do Tema 1234", valor: `${brl(rota.custo.tetoEmReais)} (210 SM)` },
    { rotulo: "Polo passivo", valor: rota.poloPassivo.join(" + ") },
    { rotulo: "Custeio", valor: rota.custeio },
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <IconeBalanca className="size-5" />
        <h2 className="fonte-display text-lg font-semibold">
          Justiça {rota.justica === "federal" ? "Federal" : "Estadual"}
        </h2>
        <span className="rounded-full bg-[var(--surface-tertiary)] px-3 py-1 text-sm text-muted">
          cálculo determinístico, sem modelo de linguagem
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {metricas.map((m) => (
          <div key={m.rotulo}>
            <dt className="text-sm text-muted">{m.rotulo}</dt>
            <dd className="num mt-0.5 text-lg font-semibold">{m.valor}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-5 flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-sm">
        {rota.fundamento.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden="true" className="text-muted">
              —
            </span>
            {f}
          </li>
        ))}
      </ul>

      <details className="mt-4 border-t border-[var(--border)] pt-4">
        <summary className="controle flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <IconeChevron className="size-4" />
          Memória de cálculo
        </summary>
        <ol className="num mt-2 flex list-inside list-decimal flex-col gap-1 text-sm text-muted">
          {rota.custo.memoria.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function Achado({
  titulo, status, resumo, evidencias, fonte, acao,
}: {
  titulo: string;
  status: StatusRequisito;
  resumo: string;
  evidencias: string[];
  fonte: string;
  acao: string;
}) {
  return (
    <details className="group rounded-2xl border border-[var(--border)] bg-surface">
      <summary className="controle flex cursor-pointer list-none items-start gap-3 p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="fonte-display text-lg font-semibold">{titulo}</h3>
            <Estado status={status} />
          </div>
          <p className="mt-2 text-sm text-muted">{resumo}</p>
        </div>
        <IconeChevron className="mt-1 size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-[var(--border)] px-6 py-5">
        {evidencias.length > 0 && (
          <div className="mb-5">
            <h4 className="mb-2 text-sm font-semibold">Trecho do documento</h4>
            <ul className="flex flex-col gap-2">
              {evidencias.map((e) => (
                <li
                  key={e}
                  className="border-s-2 border-[var(--color-marca)] bg-[var(--surface-secondary)] px-4 py-2 text-base leading-relaxed"
                >
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-5">
          <h4 className="mb-1 text-sm font-semibold">Próxima ação</h4>
          <p className="text-base">{acao}</p>
        </div>

        <p className="text-sm text-muted">Fonte: {fonte}</p>
      </div>
    </details>
  );
}
