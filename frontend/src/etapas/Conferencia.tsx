import { useState } from "react";
import { Button, Checkbox, Input, Label, NumberField, Spinner, TextField } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { IconeOk, IconeRevisao, IconeSeta } from "../components/Icones.tsx";
import { api, brl, type ApresentacaoCmed } from "../lib/api.ts";
import type { DadosMedicamento, Documentos } from "../lib/caso.ts";

interface Props {
  documentos: Documentos;
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
  documentos, medicamento, carregando, onMudar, onVoltar, onAnalisar,
}: Props) {
  const set = <K extends keyof DadosMedicamento>(k: K, v: DadosMedicamento[K]) =>
    onMudar({ ...medicamento, [k]: v });

  const completo = medicamento.nome.trim() !== "" && medicamento.precoApresentacao > 0;
  const [origem, setOrigem] = useState<ApresentacaoCmed | null>(null);

  function aplicarDaCmed(a: ApresentacaoCmed) {
    setOrigem(a);
    onMudar({
      ...medicamento,
      nome: `${a.produto} — ${a.apresentacao}`,
      precoApresentacao: Number(a.pmvg_0 ?? 0),
      precoOrigem: "cmed",
      // Apresentação ambígua (volume, creme, spray) vem sem unidades:
      // mantém o que está lá para o advogado conferir, não chuta.
      unidadesPorApresentacao:
        a.unidades_por_apresentacao ?? medicamento.unidadesPorApresentacao,
    });
  }

  return (
    <>
      <Cabecalho
        descricao="Estes números definem a competência e o polo passivo. Confira a apresentação na tabela CMED antes de seguir."
        passo="Etapa 2 de 4"
        titulo="Conferência das informações"
      />

      <div className="flex flex-col gap-6">
        <BuscaCmed
          laudo={documentos.laudo}
          receita={documentos.receita}
          onEscolher={aplicarDaCmed}
          onPosologia={(p) =>
            onMudar({
              ...medicamento,
              unidadesPorTomada: p.unidadesPorTomada ?? medicamento.unidadesPorTomada,
              tomadasPorDia: p.tomadasPorDia ?? medicamento.tomadasPorDia,
              diasPorAno: p.diasPorAno ?? medicamento.diasPorAno,
            })
          }
        />

        <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
          <h2 className="fonte-display mb-5 text-lg font-semibold">Medicamento</h2>
          {origem && (
            <p className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full bg-[var(--status-ok-bg)] px-3 py-1 text-sm font-medium text-[var(--status-ok-fg)]">
              <IconeOk className="size-4 shrink-0" />
              Preço da tabela CMED {origem.tabela_versao}, coluna PMVG 0%
            </p>
          )}
          {origem && origem.unidades_por_apresentacao === null && (
            <p className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full bg-[var(--status-atencao-bg)] px-3 py-1 text-sm font-medium text-[var(--status-atencao-fg)]">
              <IconeRevisao className="size-4 shrink-0" />
              Esta apresentação não permite deduzir as unidades. Confira abaixo.
            </p>
          )}
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
                <Label>
                {medicamento.precoOrigem === "orcamento"
                  ? "Preço da apresentação (orçamento da parte)"
                  : "Preço da apresentação (CMED, PMVG)"}
              </Label>
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
              isSelected={medicamento.precoOrigem === "orcamento"}
              onChange={(v) => set("precoOrigem", v ? "orcamento" : "cmed")}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                A apresentação não consta da tabela CMED
              </Checkbox.Content>
            </Checkbox>
            {medicamento.precoOrigem === "orcamento" && (
              <p className="-mt-3 flex items-start gap-2 rounded-xl bg-[var(--status-atencao-bg)] px-4 py-3 text-sm text-[var(--status-atencao-fg)]">
                <IconeRevisao className="mt-0.5 size-4 shrink-0" />
                <span>
                  Informe o orçamento da parte autora. Ele vale como referência{" "}
                  <strong>provisória</strong> para valor da causa e competência: o
                  Guia do CNJ orienta oficiar a CMED para obter o preço e, sem
                  resposta a tempo, usar o orçamento. O dossiê sai com essa ressalva.
                </span>
              </p>
            )}

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

/**
 * Busca na lista de preços da CMED. É a diferença entre um número digitado e
 * um número com procedência: é ele que define competência e polo passivo.
 */
function BuscaCmed({
  laudo,
  receita,
  onEscolher,
  onPosologia,
}: {
  laudo: string;
  receita: string;
  onEscolher: (a: ApresentacaoCmed) => void;
  onPosologia: (p: {
    unidadesPorTomada?: number;
    tomadasPorDia?: number;
    diasPorAno?: number;
  }) => void;
}) {
  const temDocumentos = `${laudo}${receita}`.trim().length > 10;
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ApresentacaoCmed[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [posologiaLida, setPosologiaLida] = useState<string[] | null>(null);
  const [posologiaFaltante, setPosologiaFaltante] = useState<string[]>([]);
  const [citados, setCitados] = useState<
    { principioAtivo: string; papel: "pedido" | "ja_tentado" | "indefinido" }[] | null
  >(null);

  /**
   * Lê os documentos cruzando com o vocabulário da CMED. Determinístico e no
   * servidor do projeto: nenhum texto vai para o modelo nesta etapa.
   */
  async function lerDosDocumentos() {
    setBuscando(true);
    setErro(null);
    try {
      const r = await api.reconhecer(laudo, receita);
      setCitados(r.achados);
      setResultados(r.apresentacoes);
      setPosologiaLida(r.posologia.evidencias);
      // O que a receita não disse continua com o valor que estava no
      // formulário. Sem dizer isso, o campo parece lido quando não foi.
      setPosologiaFaltante(
        [
          r.posologia.unidadesPorTomada === undefined ? "unidades por tomada" : null,
          r.posologia.tomadasPorDia === undefined ? "tomadas por dia" : null,
          r.posologia.diasPorAno === undefined ? "dias por ano" : null,
        ].filter((c): c is string => c !== null),
      );
      onPosologia(r.posologia);
      if (!r.achados.length) {
        setErro(
          "Nenhum princípio ativo da lista da CMED foi citado nos documentos. " +
            "Pode ser medicamento fora da tabela — preencha o preço abaixo como orçamento.",
        );
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler os documentos.");
    } finally {
      setBuscando(false);
    }
  }

  async function buscar() {
    if (termo.trim().length < 3) {
      setErro("Digite ao menos 3 caracteres.");
      return;
    }
    setBuscando(true);
    setErro(null);
    try {
      setResultados(await api.cmed(termo.trim()));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na busca.");
      setResultados(null);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
      <h2 className="fonte-display mb-1 text-lg font-semibold">
        Buscar na tabela CMED
      </h2>
      <p className="mb-5 text-sm text-muted">
        Pelo princípio ativo ou pelo nome comercial. O preço vem da coluna
        PMVG 0%, que é a que o Tema 1234 manda usar para valor da causa e
        competência.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <TextField
          className="min-w-56 flex-1"
          value={termo}
          onChange={setTermo}
          onKeyDown={(e) => {
            if (e.key === "Enter") void buscar();
          }}
        >
          <Label>Princípio ativo ou produto</Label>
          <Input className="controle" placeholder="Ex.: dapagliflozina" />
        </TextField>
        <Button
          className="controle"
          isPending={buscando}
          variant="secondary"
          onPress={() => void buscar()}
        >
          {buscando ? <Spinner size="sm" /> : null}
          Buscar
        </Button>
        {temDocumentos && (
          <Button
            className="controle"
            isPending={buscando}
            variant="secondary"
            onPress={() => void lerDosDocumentos()}
          >
            Ler dos documentos
          </Button>
        )}
      </div>

      {citados && citados.length > 0 && (
        <div className="mt-4 flex flex-col gap-1 text-sm">
          {citados.some((c) => c.papel === "pedido") && (
            <p>
              <span className="text-muted">Provável medicamento do pedido: </span>
              <span className="font-medium">
                {citados.filter((c) => c.papel === "pedido").map((c) => c.principioAtivo).join(", ")}
              </span>
            </p>
          )}
          {citados.some((c) => c.papel !== "pedido") && (
            <p className="text-muted">
              Já citados como tentados:{" "}
              {citados.filter((c) => c.papel !== "pedido").map((c) => c.principioAtivo).join(", ")}
              {" "}— servem ao requisito de impossibilidade de substituição.
            </p>
          )}
          <p className="text-muted">
            A ordem é um palpite pela redação do laudo. Confira antes de escolher.
          </p>
          {posologiaLida && posologiaLida.length > 0 && (
            <p className="text-muted">
              Posologia preenchida a partir de: {posologiaLida.join(", ")}.
            </p>
          )}
          {posologiaFaltante.length > 0 && (
            <p className="flex items-start gap-2 text-[var(--status-atencao-fg)]">
              <IconeRevisao className="mt-0.5 size-4 shrink-0" />
              <span>
                Não identifiquei nos documentos: {posologiaFaltante.join(", ")}.
                Esses campos ficaram com o valor que já estava — confira abaixo.
              </span>
            </p>
          )}
        </div>
      )}

      {erro && (
        <p className="mt-4 text-sm text-[var(--status-erro-fg)]">{erro}</p>
      )}

      {resultados?.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Nenhuma apresentação encontrada. Confira a grafia ou preencha os
          campos abaixo à mão.
        </p>
      )}

      {resultados && resultados.length > 0 && (
        <ul className="mt-5 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {resultados.map((a) => (
            <li key={a.id}>
              <button
                className="controle w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-start hover:bg-[var(--surface-tertiary)]"
                type="button"
                onClick={() => onEscolher(a)}
              >
                <span className="block font-medium">{a.produto}</span>
                <span className="block text-sm text-muted">{a.apresentacao}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="num font-semibold">
                    {a.pmvg_0 ? brl(Number(a.pmvg_0)) : "sem PMVG"}
                  </span>
                  <span className="num text-muted">
                    {a.unidades_por_apresentacao
                      ? `${a.unidades_por_apresentacao} un.`
                      : "unidades a confirmar"}
                  </span>
                  {a.laboratorio && (
                    <span className="text-muted">{a.laboratorio}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
