import { Button, Card, Tabs } from "@heroui/react";
import type { Dossie } from "../lib/api.ts";

const PECAS: { id: keyof Dossie; titulo: string }[] = [
  { id: "memorandoDeRota", titulo: "Memorando de rota" },
  { id: "requerimentoAdministrativo", titulo: "Requerimento administrativo" },
  { id: "resumoDeEvidencia", titulo: "Resumo de evidência" },
  { id: "trechoDePeticao", titulo: "Trecho de petição" },
];

export function PainelDossie({ dossie }: { dossie: Dossie }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Dossiê gerado</Card.Title>
        <Card.Description>
          Minuta revisável. Confira cada citação antes de usar.
        </Card.Description>
      </Card.Header>

      <Card.Content>
        <Tabs defaultSelectedKey="memorandoDeRota">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Peças do dossiê">
              {PECAS.map((p) => (
                <Tabs.Tab key={p.id} id={p.id}>{p.titulo}</Tabs.Tab>
              ))}
              <Tabs.Tab id="pendencias">Pendências do cliente</Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          {PECAS.map((p) => (
            <Tabs.Panel key={p.id} className="pt-4" id={p.id}>
              <div className="flex flex-col gap-3">
                <Button
                  className="self-end"
                  size="sm"
                  variant="secondary"
                  onPress={() => navigator.clipboard.writeText(dossie[p.id] as string)}
                >
                  Copiar
                </Button>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {dossie[p.id] as string}
                </pre>
              </div>
            </Tabs.Panel>
          ))}

          <Tabs.Panel className="pt-4" id="pendencias">
            <ol className="list-inside list-decimal space-y-2 text-sm">
              {dossie.pendenciasDoCliente.map((p) => <li key={p}>{p}</li>)}
            </ol>
          </Tabs.Panel>
        </Tabs>
      </Card.Content>
    </Card>
  );
}
