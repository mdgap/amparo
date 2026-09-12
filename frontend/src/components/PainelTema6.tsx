import { Alert, Card, Chip } from "@heroui/react";
import type { Analise, RequisitoTema6, StatusRequisito } from "../lib/api.ts";

const CORES: Record<StatusRequisito, "success" | "warning" | "danger" | "default"> = {
  ok: "success",
  fraco: "warning",
  falta: "danger",
  nao_avaliado: "default",
};

const ROTULOS: Record<StatusRequisito, string> = {
  ok: "comprovado",
  fraco: "frágil",
  falta: "falta",
  nao_avaliado: "não avaliado",
};

export function PainelTema6({
  tema6,
  catalogo,
}: {
  tema6: NonNullable<Analise["tema6"]>;
  catalogo: RequisitoTema6[];
}) {
  const { resumo, avaliacoes } = tema6;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Requisitos do Tema 6</Card.Title>
        <Card.Description>
          {resumo.ok} de {resumo.total} comprovados.{" "}
          {resumo.aptoParaProtocolo
            ? "Documentação completa para os seis requisitos."
            : "Complete as pendências antes de protocolar."}
        </Card.Description>
      </Card.Header>

      <Card.Content className="flex flex-col gap-4">
        {tema6.alertaENatJus && (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Divergência com a nota do e-NatJus</Alert.Title>
              <Alert.Description>{tema6.alertaENatJus}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <ul className="flex flex-col gap-3">
          {catalogo.map((req) => {
            const av = avaliacoes.find((a) => a.id === req.id);
            const status: StatusRequisito = av?.status ?? "nao_avaliado";
            return (
              <li key={req.id} className="rounded-lg border border-default p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{req.titulo}</span>
                  <Chip color={CORES[status]} size="sm" variant="soft">
                    {ROTULOS[status]}
                  </Chip>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {av?.justificativa ?? req.descricao}
                </p>
                {av?.evidencias?.length ? (
                  <ul className="mt-2 space-y-1 border-l-2 border-default pl-3 text-sm italic text-muted">
                    {av.evidencias.map((e) => <li key={e}>“{e}”</li>)}
                  </ul>
                ) : null}
                {status !== "ok" && (
                  <p className="mt-2 text-sm">
                    <strong>Pendência:</strong> {av?.pendencia ?? req.comoComprovar}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted">Fonte: {req.fonte}</p>
              </li>
            );
          })}
        </ul>

        {tema6.fontes.length > 0 && (
          <details className="rounded-lg border border-default p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Trechos do corpus usados ({tema6.fontes.length})
            </summary>
            <ol className="mt-2 space-y-2 text-sm text-muted">
              {tema6.fontes.map((f, i) => (
                <li key={f.trecho_id}>
                  <strong>[F{i + 1}]</strong> {f.documento}
                  {f.ancora ? ` — ${f.ancora}` : ""}
                </li>
              ))}
            </ol>
          </details>
        )}
      </Card.Content>
    </Card>
  );
}
