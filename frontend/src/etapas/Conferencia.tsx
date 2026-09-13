import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, Input, Label, NumberField, Spinner, TextField } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import {
  IconeAchados, IconeCalculadora, IconeConferencia, IconeOk, IconeRemedio,
  IconeRevisao, IconeSeta,
} from "../components/Icones.tsx";
import { AjudaIA } from "../components/AjudaIA.tsx";
import { api, brl, type ApresentacaoCmed } from "../lib/api.ts";
import {
  SITUACOES_CONITEC, type DadosMedicamento, type DadosProcessuais,
  type Documentos,
} from "../lib/caso.ts";

interface Props {
  documentos: Documentos;
  processuais: DadosProcessuais;
  onMudarProcessuais: (p: DadosProcessuais) => void;
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
  documentos, medicamento, processuais, carregando, onMudar, onMudarProcessuais,
  onVoltar, onAnalisar,
}: Props) {
  const set = <K extends keyof DadosMedicamento>(k: K, v: DadosMedicamento[K]) =>
    onMudar({ ...medicamento, [k]: v });

  const completo = medicamento.nome.trim() !== "" && medicamento.precoApresentacao > 0;
  const [origem, setOrigem] = useState<ApresentacaoCmed | null>(null);

  function aplicarDaCmed(a: ApresentacaoCmed) {
    setOrigem(a);
    onMudar({
      ...medicamento,
      nome: `${a.produto} (${a.apresentacao})`,
      principioAtivo: a.principio_ativo,
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
        etapaAtual={2}
        titulo="Conferência das informações"
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <div className="flex min-w-0 flex-col gap-5">
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

        <section className="cartao p-[1.375rem]">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="icone-secao">
              <IconeConferencia className="size-5" />
            </span>
            <h2 className="fonte-display text-[1.125rem] font-bold">Medicamento</h2>
          </div>
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

        <SituacaoProcessual
          dados={processuais}
          medicamento={medicamento.nome}
          principioAtivo={medicamento.principioAtivo}
          onMudar={onMudarProcessuais}
        />
        </div>

        <section className="cartao p-[1.375rem]">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="icone-secao">
              <IconeRemedio className="size-5" />
            </span>
            <h2 className="fonte-display text-[1.125rem] font-bold">Posologia</h2>
          </div>
          <p className="mb-5 text-xs text-muted">
            Multiplica o preço da apresentação e define o custo anual.
          </p>
          <div className="grid gap-5">
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

      <div className="barra-acao mt-6 flex flex-wrap items-center gap-3 px-4 py-3">
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
            "Pode ser medicamento fora da tabela. Preencha o preço abaixo como orçamento.",
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
    <section className="cartao p-[1.375rem]">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="icone-secao">
          <IconeAchados className="size-5" />
        </span>
        <h2 className="fonte-display text-[1.125rem] font-bold">
          Buscar na tabela CMED
        </h2>
      </div>
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

      {temDocumentos && (
        <div className="mt-4">
          <AjudaIA
            ponto="reconhecimento"
            rotulo="Como o medicamento e a posologia são lidos dos documentos"
          />
        </div>
      )}

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
              . Servem ao requisito de impossibilidade de substituição.
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
                Esses campos ficaram com o valor que já estava. Confira abaixo.
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

/**
 * Dois dos seis requisitos do Tema 6 são conferidos aqui, não lidos dos
 * documentos: a situação na CONITEC vem de consulta ao portal e a
 * hipossuficiência de declaração e comprovante. Nenhum dos dois aparece em
 * laudo ou receita — pedir ao modelo que os encontrasse ali produzia "falta"
 * em todo caso. Informados aqui, viram regra: o prazo do art. 19-R é contado
 * por data, em código.
 */
function SituacaoProcessual({
  dados,
  medicamento,
  principioAtivo,
  onMudar,
}: {
  dados: DadosProcessuais;
  medicamento: string;
  /** O painel da CONITEC indexa por tecnologia, não por nome comercial. */
  principioAtivo?: string;
  onMudar: (d: DadosProcessuais) => void;
}) {
  const { conitec, hipossuficiencia } = dados;
  const [consultando, setConsultando] = useState(false);
  const [registros, setRegistros] = useState<Awaited<ReturnType<typeof api.conitec>> | null>(null);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  /** Preenchido pela consulta, não pelo advogado. Vira selo, e some se ele mexer. */
  const [automatico, setAutomatico] = useState<string | null>(null);
  /** Último termo consultado sozinho, para não repetir a cada render. */
  const jaConsultado = useRef<string | null>(null);
  /** Estado mais recente: a consulta responde depois do render que a disparou. */
  const atual = useRef(dados);
  atual.current = dados;

  /**
   * Termo da consulta. O princípio ativo é o que o painel indexa; o nome
   * comercial só serve de reserva.
   *
   * Palavra genérica é descartada: "Medicamento sintético 50 mg" buscava
   * "Medicamento" e trazia nove registros de "Medicamentos biológicos",
   * nenhum do caso. Sem termo utilizável, não se consulta — melhor campo
   * vazio que lista errada.
   */
  const GENERICAS = new Set([
    "medicamento", "medicamentos", "comprimido", "comprimidos", "capsula",
    "capsulas", "cápsula", "cápsulas", "caixa", "frasco", "ampola", "solucao",
    "solução", "sintetico", "sintético", "generico", "genérico", "oral",
    "injetavel", "injetável", "suspensao", "suspensão", "revestido",
  ]);

  function termoDaBusca(): string {
    const candidatos = [principioAtivo, medicamento];
    for (const bruto of candidatos) {
      const palavra = (bruto ?? "")
        .split(/[\s—\-,;]+/)
        .map((p) => p.trim())
        .find((p) => p.length >= 4 && !GENERICAS.has(p.toLowerCase()) && !/^\d/.test(p));
      if (palavra) return palavra;
    }
    return "";
  }

  /**
   * Consulta o painel da CONITEC e PROPÕE a situação — não decide. O mesmo
   * princípio ativo aparece várias vezes, com decisões opostas em anos
   * diferentes; qual delas vale depende da indicação clínica do caso.
   *
   * `automatica` só muda o que acontece com um resultado SEM ambiguidade;
   * havendo mais de um registro, a escolha continua sendo do advogado.
   */
  async function consultar(automatica = false) {
    const termo = termoDaBusca();
    if (!termo) {
      setErroConsulta(
        "Sem princípio ativo para consultar. Informe a situação abaixo.",
      );
      return;
    }
    setConsultando(true);
    setErroConsulta(null);
    try {
      const r = await api.conitec(termo);
      setRegistros(r);
      if (automatica) preencherSeNaoHouverDuvida(r);
    } catch (e) {
      // Falha aqui nunca trava a etapa: o campo abaixo continua editável, e
      // sem ele a demonstração seguiria emperrada por um painel fora do ar.
      setErroConsulta(
        automatica
          ? "Não consegui consultar o painel da CONITEC agora. Informe a situação abaixo."
          : e instanceof Error
            ? e.message
            : "Falha na consulta.",
      );
    } finally {
      setConsultando(false);
    }
  }

  /**
   * Preenche só quando o painel não deixa dúvida: nenhum registro (nunca houve
   * pedido de incorporação) ou um único registro com situação reconhecida.
   * Com vários, a tela lista e quem escolhe é o advogado.
   */
  function preencherSeNaoHouverDuvida(r: NonNullable<typeof registros>) {
    if (r.nuncaDemandado) {
      onMudar({
        ...atual.current,
        conitec: { ...atual.current.conitec, situacao: "nunca_avaliado", desde: "" },
      });
      setAutomatico("Não consta do painel: nunca houve pedido de incorporação.");
      return;
    }
    const unico = r.registros.length === 1 ? r.registros[0] : undefined;
    if (unico && unico.situacaoSugerida !== "nao_informado") {
      aplicar(unico);
      setAutomatico(`Registro único no painel de ${r.painelVersao}: ${unico.status}`);
    }
  }

  /**
   * Consulta ao chegar na etapa, enquanto o campo estiver intocado. Não
   * sobrescreve escolha do advogado e não bloqueia nada: se falhar, o campo
   * abaixo segue valendo.
   */
  useEffect(() => {
    const termo = termoDaBusca();
    if (!termo) return;
    if (conitec.situacao !== "nao_informado") return;
    if (jaConsultado.current === termo) return;
    jaConsultado.current = termo;
    void consultar(true);
    // Só o medicamento redispara: mudar a situação à mão não deve reconsultar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicamento, principioAtivo]);

  function aplicar(r: NonNullable<typeof registros>["registros"][number]) {
    const data = r.situacaoSugerida === "desfavoravel" ? r.data_decisao : r.data_protocolo;
    onMudar({
      ...atual.current,
      conitec: {
        ...atual.current.conitec,
        situacao:
          r.situacaoSugerida === "nao_informado"
            ? atual.current.conitec.situacao
            : r.situacaoSugerida,
        desde: data ? data.slice(0, 10) : "",
      },
    });
  }

  return (
    <section className="cartao p-[1.375rem]">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="icone-secao">
          <IconeCalculadora className="size-5" />
        </span>
        <h2 className="fonte-display text-[1.125rem] font-bold">
          Situação processual
        </h2>
      </div>
      <p className="mb-5 text-xs text-muted">
        Dois requisitos do Tema 6 não estão nos documentos. Informe aqui: eles
        são apurados por regra, não pelo modelo.
      </p>

      <div className="flex flex-col gap-5">
        {medicamento.trim() !== "" && (
          <div className="rounded-[0.5625rem] border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
            {termoDaBusca() === "" ? (
              <p className="text-xs leading-relaxed text-muted">
                Sem princípio ativo para consultar o painel: o nome informado
                não traz um termo pesquisável. Escolha a apresentação na busca
                da CMED acima, ou informe a situação abaixo — a consulta não é
                obrigatória para seguir.
              </p>
            ) : (
              <Button
                className="controle w-full"
                isPending={consultando}
                size="sm"
                variant="secondary"
                onPress={() => void consultar()}
              >
                {consultando ? <Spinner size="sm" /> : null}
                {registros ? "Consultar de novo" : "Consultar no painel da CONITEC"}
              </Button>
            )}

            {erroConsulta && (
              <p className="mt-2 text-xs text-[var(--status-erro-fg)]">{erroConsulta}</p>
            )}

            {registros?.nuncaDemandado && (
              <p className="mt-2 text-xs text-[var(--status-ok-fg)]">
                Não consta do painel de tecnologias demandadas. Isso indica que
                nunca houve pedido de incorporação. Confira e marque abaixo.
              </p>
            )}

            {registros && registros.registros.length > 0 && (
              <>
                <p className="mt-3 text-xs text-muted">
                  {registros.registros.length} registro(s) no painel de{" "}
                  {registros.painelVersao}. O mesmo princípio ativo aparece mais
                  de uma vez: escolha o que corresponde à indicação do caso.
                </p>
                <ul className="mt-2 flex max-h-52 flex-col gap-2 overflow-y-auto">
                  {registros.registros.map((r, i) => (
                    <li key={`${r.tecnologia}-${i}`}>
                      <button
                        className="w-full rounded-[0.5625rem] border border-[var(--border)] bg-surface px-3 py-2 text-start text-xs hover:bg-[var(--surface-tertiary)]"
                        type="button"
                        onClick={() => aplicar(r)}
                      >
                        <span className="block font-medium">{r.tecnologia}</span>
                        <span className="block text-muted">{r.status}</span>
                        {r.indicacao && (
                          <span className="mt-1 block text-muted">{r.indicacao}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div>
          <label
            className="mb-2 block text-[0.8125rem] text-[#294b36]"
            htmlFor="conitec-situacao"
          >
            Situação na CONITEC
          </label>
          <select
            className="controle w-full rounded-[0.5625rem] border border-[#bfcfc5] bg-white px-3 text-sm"
            id="conitec-situacao"
            value={conitec.situacao}
            onChange={(e) => {
              // Escolha à mão substitui a sugestão: o selo sai junto.
              setAutomatico(null);
              onMudar({
                ...dados,
                conitec: {
                  ...conitec,
                  situacao: e.target.value as DadosProcessuais["conitec"]["situacao"],
                },
              });
            }}
          >
            {SITUACOES_CONITEC.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
          {automatico && (
            <p className="mt-2 flex items-start gap-1.5 rounded-[0.375rem] border border-[#c8e5d2] bg-[var(--status-ok-bg)] px-2.5 py-2 text-xs text-[var(--status-ok-fg)]">
              <IconeOk className="mt-0.5 size-[0.875rem] shrink-0" />
              <span>
                Preenchido pela consulta ao painel — {automatico} Confira antes
                de seguir; mudar o campo acima substitui a sugestão.
              </span>
            </p>
          )}
          <p className="helper mt-2 text-xs leading-relaxed text-muted">
            Consulte em gov.br/conitec. Nunca avaliado já satisfaz o requisito;
            em análise depende do prazo de 180 dias, prorrogável por 90.
          </p>
        </div>

        {(conitec.situacao === "em_analise" || conitec.situacao === "desfavoravel") && (
          <div>
            <label
              className="mb-2 block text-[0.8125rem] text-[#294b36]"
              htmlFor="conitec-desde"
            >
              {conitec.situacao === "em_analise"
                ? "Data do protocolo na CONITEC"
                : "Data da decisão"}
            </label>
            <input
              className="controle w-full rounded-[0.5625rem] border border-[#bfcfc5] bg-white px-3 text-sm"
              id="conitec-desde"
              type="date"
              value={conitec.desde}
              onChange={(e) =>
                onMudar({ ...dados, conitec: { ...conitec, desde: e.target.value } })
              }
            />
            {conitec.situacao === "em_analise" && !conitec.desde && (
              <p className="mt-2 text-xs text-[var(--status-atencao-fg)]">
                Sem a data não é possível apurar a mora. O requisito fica como
                revisão necessária.
              </p>
            )}
          </div>
        )}

        {conitec.situacao === "desfavoravel" && (
          <Checkbox
            isSelected={conitec.ilegalidadeDemonstrada}
            onChange={(v) =>
              onMudar({
                ...dados,
                conitec: { ...conitec, ilegalidadeDemonstrada: v },
              })
            }
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Há demonstração da ilegalidade do ato da CONITEC
            </Checkbox.Content>
          </Checkbox>
        )}

        <div className="border-t border-[var(--border)] pt-5">
          <p className="mb-3 text-[0.8125rem] text-[#294b36]">
            Incapacidade financeira
          </p>
          <div className="flex flex-col gap-3">
            <Checkbox
              isSelected={hipossuficiencia.declaracao}
              onChange={(v) =>
                onMudar({
                  ...dados,
                  hipossuficiencia: { ...hipossuficiencia, declaracao: v },
                })
              }
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Declaração de hipossuficiência assinada
              </Checkbox.Content>
            </Checkbox>
            <Checkbox
              isSelected={hipossuficiencia.comprovanteRenda}
              onChange={(v) =>
                onMudar({
                  ...dados,
                  hipossuficiencia: { ...hipossuficiencia, comprovanteRenda: v },
                })
              }
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Comprovante de renda anexado
              </Checkbox.Content>
            </Checkbox>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Só a declaração não basta: a tese pede prova consistente.
          </p>
        </div>

        <AjudaIA
          ponto="formulario"
          rotulo="Como estes dois requisitos são apurados"
        />
      </div>
    </section>
  );
}
