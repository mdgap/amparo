import { useState } from "react";
import {
  Button, Card, Checkbox, Input, Label, NumberField, TextArea, TextField,
} from "@heroui/react";
import type { EntradaCaso } from "../lib/api.ts";

interface Props {
  carregando: boolean;
  onAnalisar: (entrada: EntradaCaso) => void;
}

const CASO_EXEMPLO: EntradaCaso = {
  medicamento: {
    nome: "Medicamento sintético 50 mg",
    precoApresentacao: 8420.55,
    unidadesPorApresentacao: 30,
    registroAnvisa: { possui: true },
  },
  posologia: { unidadesPorTomada: 1, tomadasPorDia: 2, diasPorAno: 365 },
  documentos: {
    laudo:
      "Paciente em acompanhamento há 3 anos, CID exemplo. Tratamentos do SUS tentados sem resposta. Uso contínuo indicado, sem alternativa terapêutica adequada disponível na rede.",
    requerimentoAdministrativo: "Protocolo na secretaria estadual em 10/08/2026, sem resposta até a data.",
  },
};

export function FormularioCaso({ carregando, onAnalisar }: Props) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState<number>(0);
  const [unidades, setUnidades] = useState<number>(30);
  const [porTomada, setPorTomada] = useState<number>(1);
  const [porDia, setPorDia] = useState<number>(1);
  const [dias, setDias] = useState<number>(365);
  const [temRegistro, setTemRegistro] = useState(true);
  const [laudo, setLaudo] = useState("");
  const [nota, setNota] = useState("");
  const [administrativo, setAdministrativo] = useState("");

  function preencherExemplo() {
    setNome(CASO_EXEMPLO.medicamento.nome);
    setPreco(CASO_EXEMPLO.medicamento.precoApresentacao);
    setUnidades(CASO_EXEMPLO.medicamento.unidadesPorApresentacao);
    setPorTomada(CASO_EXEMPLO.posologia.unidadesPorTomada);
    setPorDia(CASO_EXEMPLO.posologia.tomadasPorDia);
    setDias(CASO_EXEMPLO.posologia.diasPorAno);
    setLaudo(CASO_EXEMPLO.documentos!.laudo);
    setAdministrativo(CASO_EXEMPLO.documentos!.requerimentoAdministrativo ?? "");
  }

  function enviar(apenasRota: boolean) {
    onAnalisar({
      medicamento: {
        nome,
        precoApresentacao: preco,
        unidadesPorApresentacao: unidades,
        registroAnvisa: { possui: temRegistro },
      },
      posologia: { unidadesPorTomada: porTomada, tomadasPorDia: porDia, diasPorAno: dias },
      documentos: { laudo, notaENatJus: nota, requerimentoAdministrativo: administrativo },
      apenasRota,
    });
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>Dados do caso</Card.Title>
        <Card.Description>
          Sem nome e sem CPF. O preço vem da tabela CMED (PMVG).
        </Card.Description>
      </Card.Header>

      <Card.Content className="flex flex-col gap-5">
        <TextField name="medicamento" value={nome} onChange={setNome} isRequired>
          <Label>Medicamento e apresentação</Label>
          <Input placeholder="Ex.: Fármaco X 50 mg, caixa com 30 comprimidos" />
        </TextField>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            value={preco}
            onChange={setPreco}
            minValue={0}
            formatOptions={{ style: "currency", currency: "BRL" }}
          >
            <Label>Preço da apresentação (CMED)</Label>
            <NumberField.Group>
              <NumberField.Input />
            </NumberField.Group>
          </NumberField>

          <NumberField value={unidades} onChange={setUnidades} minValue={1}>
            <Label>Unidades por apresentação</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField value={porTomada} onChange={setPorTomada} minValue={0.25} step={0.25}>
            <Label>Unidades por tomada</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>

          <NumberField value={porDia} onChange={setPorDia} minValue={1}>
            <Label>Tomadas por dia</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>

          <NumberField value={dias} onChange={setDias} minValue={1} maxValue={366}>
            <Label>Dias de tratamento por ano</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
        </div>

        <Checkbox isSelected={temRegistro} onChange={setTemRegistro}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Medicamento com registro na ANVISA
          </Checkbox.Content>
        </Checkbox>

        <div className="flex flex-col gap-2">
          <Label>Laudo médico (texto anonimizado)</Label>
          <TextArea
            aria-label="Laudo médico"
            className="h-32"
            value={laudo}
            onChange={(e) => setLaudo(e.target.value)}
            placeholder="Cole o laudo sem nome e sem CPF"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Pedido administrativo</Label>
            <TextArea
              aria-label="Pedido administrativo"
              className="h-24"
              value={administrativo}
              onChange={(e) => setAdministrativo(e.target.value)}
              placeholder="Houve protocolo? Qual foi a resposta?"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Nota técnica do e-NatJus (opcional)</Label>
            <TextArea
              aria-label="Nota e-NatJus"
              className="h-24"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Cole a nota, se localizada na consulta pública"
            />
          </div>
        </div>
      </Card.Content>

      <Card.Footer className="flex flex-wrap gap-3">
        <Button variant="primary" isPending={carregando} onPress={() => enviar(false)}>
          Gerar dossiê
        </Button>
        <Button variant="secondary" onPress={() => enviar(true)}>
          Só calcular a rota
        </Button>
        <Button variant="ghost" onPress={preencherExemplo}>
          Caso sintético de exemplo
        </Button>
      </Card.Footer>
    </Card>
  );
}
