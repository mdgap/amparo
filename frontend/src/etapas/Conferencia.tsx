import { Button, Checkbox, Input, Label, NumberField, TextField } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { IconeSeta } from "../components/Icones.tsx";
import type { DadosMedicamento } from "../lib/caso.ts";

interface Props {
  medicamento: DadosMedicamento;
  carregando: boolean;
  onMudar: (m: DadosMedicamento) => void;
  onVoltar: () => void;
  onAnalisar: () => void;
}

/**
 * Conferência humana dos dados que alimentam o motor de regras. Estes campos
 * definem foro e polo passivo, então são conferidos antes de qualquer análise.
 */
export function Conferencia({
  medicamento, carregando, onMudar, onVoltar, onAnalisar,
}: Props) {
  const set = <K extends keyof DadosMedicamento>(k: K, v: DadosMedicamento[K]) =>
    onMudar({ ...medicamento, [k]: v });

  const completo = medicamento.nome.trim() !== "" && medicamento.precoApresentacao > 0;

  return (
    <>
      <Cabecalho
        descricao="Estes números definem a competência e o polo passivo. Confira a apresentação na tabela CMED antes de seguir."
        passo="Etapa 2 de 4"
        titulo="Conferência das informações"
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
          <h2 className="fonte-display mb-5 text-lg font-semibold">Medicamento</h2>
          <div className="flex flex-col gap-5">
            <TextField
              isRequired
              value={medicamento.nome}
              onChange={(v) => set("nome", v)}
            >
              <Label>Medicamento e apresentação</Label>
              <Input
                className="controle"
                placeholder="Ex.: Fármaco X 50 mg, caixa com 30 comprimidos"
              />
            </TextField>

            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                formatOptions={{ style: "currency", currency: "BRL" }}
                minValue={0}
                value={medicamento.precoApresentacao}
                onChange={(v) => set("precoApresentacao", v)}
              >
                <Label>Preço da apresentação (CMED, PMVG)</Label>
                <NumberField.Group className="controle">
                  <NumberField.Input className="num" />
                </NumberField.Group>
              </NumberField>

              <NumberField
                minValue={1}
                value={medicamento.unidadesPorApresentacao}
                onChange={(v) => set("unidadesPorApresentacao", v)}
              >
                <Label>Unidades por apresentação</Label>
                <NumberField.Group className="controle">
                  <NumberField.DecrementButton />
                  <NumberField.Input className="num" />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
            </div>

            <Checkbox
              isSelected={medicamento.comRegistroAnvisa}
              onChange={(v) => set("comRegistroAnvisa", v)}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Medicamento com registro na ANVISA
              </Checkbox.Content>
            </Checkbox>
            <p className="-mt-3 text-sm text-muted">
              Sem registro, a competência é federal por força do Tema 500, qualquer
              que seja o custo.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
          <h2 className="fonte-display mb-5 text-lg font-semibold">Posologia</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField
              minValue={0.25}
              step={0.25}
              value={medicamento.unidadesPorTomada}
              onChange={(v) => set("unidadesPorTomada", v)}
            >
              <Label>Unidades por tomada</Label>
              <NumberField.Group className="controle">
                <NumberField.DecrementButton />
                <NumberField.Input className="num" />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>

            <NumberField
              minValue={1}
              value={medicamento.tomadasPorDia}
              onChange={(v) => set("tomadasPorDia", v)}
            >
              <Label>Tomadas por dia</Label>
              <NumberField.Group className="controle">
                <NumberField.DecrementButton />
                <NumberField.Input className="num" />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>

            <NumberField
              maxValue={366}
              minValue={1}
              value={medicamento.diasPorAno}
              onChange={(v) => set("diasPorAno", v)}
            >
              <Label>Dias de tratamento por ano</Label>
              <NumberField.Group className="controle">
                <NumberField.DecrementButton />
                <NumberField.Input className="num" />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
        <Button
          className="controle"
          isDisabled={!completo}
          isPending={carregando}
          onPress={onAnalisar}
        >
          Analisar caso
          <IconeSeta className="size-5" />
        </Button>
        <Button className="controle" variant="secondary" onPress={onVoltar}>
          Voltar aos documentos
        </Button>
      </div>
    </>
  );
}
