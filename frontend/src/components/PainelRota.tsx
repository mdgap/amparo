import { Alert, Card, Chip } from "@heroui/react";
import { brl, type ResultadoRota } from "../lib/api.ts";

export function PainelRota({ rota }: { rota: ResultadoRota }) {
  const federal = rota.justica === "federal";

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center gap-3">
          Rota processual
          <Chip color={federal ? "warning" : "accent"} size="sm">
            Justiça {federal ? "Federal" : "Estadual"}
          </Chip>
        </Card.Title>
        <Card.Description>
          Calculado pelo motor determinístico — nenhum destes números passou pelo modelo.
        </Card.Description>
      </Card.Header>

      <Card.Content className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica rotulo="Custo anual" valor={brl(rota.custo.custoAnual)} />
          <Metrica rotulo="Em salários mínimos" valor={`${rota.custo.emSalariosMinimos} SM`} />
          <Metrica rotulo="Teto (210 SM)" valor={brl(rota.custo.tetoEmReais)} />
          <Metrica rotulo="Polo passivo" valor={rota.poloPassivo.join(" + ")} />
        </div>

        {rota.zonaDeAtencao && (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Caso limítrofe</Alert.Title>
              <Alert.Description>
                O custo está a menos de 10% do teto. Confira o preço CMED e a posologia
                antes de protocolar — uma variação pequena muda o foro.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Fundamento</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {rota.fundamento.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <details className="rounded-lg border border-default p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Memória de cálculo
          </summary>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted">
            {rota.custo.memoria.map((m) => <li key={m}>{m}</li>)}
          </ol>
        </details>
      </Card.Content>
    </Card>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{rotulo}</div>
      <div className="text-lg font-semibold">{valor}</div>
    </div>
  );
}
