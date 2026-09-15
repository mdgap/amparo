import { useEffect, useState, type ReactNode } from "react";
import { Alert, Button, Spinner } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { ESTADOS } from "../components/Estado.tsx";
import {
  IconeBalanca, IconeCalculadora, IconeDocumento, IconeOk, IconeRevisao, IconeSeta,
} from "../components/Icones.tsx";
import { brl, type RequisitoTema6 } from "../lib/api.ts";
import { historicoApi, type ItemHistorico, type Metricas } from "../lib/historico.ts";
import { DEMO } from "../demo/ativo.ts";

const POR_PAGINA = 10;

const FAIXAS: Record<ItemHistorico["faixa"], string> = {
  sem_registro_anvisa: "Sem registro na ANVISA",
  abaixo_do_piso: "Abaixo de 7 SM",
  ressarcimento_federal: "Entre 7 e 210 SM",
  acima_do_teto: "210 SM ou mais",
};

const sm = (valor: number) =>
  `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SM`;

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

interface Props {
  catalogo: RequisitoTema6[];
  /** Id da análise que está sendo reaberta, para travar os outros botões. */
  abrindo: number | null;
  onAbrir: (id: number) => void;
  onNovoCaso: () => void;
  demonstracao?: ReactNode;
}

/**
 * Tela inicial: métricas dos últimos movimentos e o histórico das análises.
 *
 * Nenhum dado aqui identifica paciente. Cada caso aparece pelo código gerado a
 * partir do id, pelo medicamento e pela data — não há campo livre de apelido,
 * que seria o lugar mais fácil de alguém digitar um nome.
 */
export function Painel({ catalogo, abrindo, onAbrir, onNovoCaso, demonstracao }: Props) {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [proximo, setProximo] = useState<number | null>(null);
  const [situacao, setSituacao] = useState<"carregando" | "pronto" | "indisponivel">("carregando");
  const [carregandoMais, setCarregandoMais] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([historicoApi.metricas(), historicoApi.historico({ limite: POR_PAGINA })])
      .then(([m, h]) => {
        if (!ativo) return;
        setMetricas(m);
        setItens(h.itens);
        setProximo(h.proximo);
        setSituacao("pronto");
      })
      .catch(() => {
        if (ativo) setSituacao("indisponivel");
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function carregarMais() {
    if (proximo === null) return;
    setCarregandoMais(true);
    try {
      const h = await historicoApi.historico({ limite: POR_PAGINA, antesDe: proximo });
      setItens((atuais) => [...atuais, ...h.itens]);
      setProximo(h.proximo);
    } catch {
      setSituacao("indisponivel");
    } finally {
      setCarregandoMais(false);
    }
  }

  const vazio = situacao === "pronto" && metricas?.total === 0;
  const tituloDoRequisito = (id: string) => catalogo.find((r) => r.id === id)?.titulo ?? id;

  return (
    <>
      <Cabecalho
        acao={
          // No estado vazio a ação principal fica no convite, não duplicada aqui.
          !vazio && (
            <Button className="controle" onPress={onNovoCaso}>
              Novo caso
              <IconeSeta className="size-5" />
            </Button>
          )
        }
        descricao={DEMO ? "Histórico fictício desta aba e métricas dos exercícios. Nenhum caso foi analisado por IA; recarregar restaura os seis exemplos." : "Métricas dos últimos movimentos e o histórico das análises. Nada aqui identifica paciente: cada caso aparece pelo código, pelo medicamento e pela data."}
        passo="Painel"
        secao="Painel de casos"
        titulo="Casos analisados"
      />

      {demonstracao}

      {situacao === "indisponivel" && (
        <Alert className="mb-6" status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Histórico indisponível agora</Alert.Title>
            <Alert.Description>
              O painel não conseguiu ler as análises salvas. Dá para começar um
              caso novo normalmente. Ele só não aparece aqui até o banco voltar.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {situacao === "carregando" && (
        <p aria-live="polite" className="flex items-center gap-3 text-sm text-muted">
          <Spinner size="sm" /> Carregando o histórico…
        </p>
      )}

      {vazio && (
        <section className="cartao flex flex-col items-start gap-4 px-6 py-8">
          <IconeDocumento className="size-7 text-[#356149]" />
          <div>
            <h2 className="fonte-display text-xl font-bold">Nenhuma análise ainda</h2>
            <p className="mt-1.5 max-w-[40rem] text-sm leading-relaxed text-muted">
              Cada análise concluída aparece aqui, com a rota processual e a
              situação dos seis requisitos do Tema 6. Comece enviando os
              documentos do primeiro caso.
            </p>
          </div>
          <Button className="controle" onPress={onNovoCaso}>
            Começar um caso
            <IconeSeta className="size-5" />
          </Button>
        </section>
      )}

      {situacao === "pronto" && metricas && metricas.total > 0 && (
        <>
          <section
            aria-label="Métricas dos últimos movimentos"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          >
            <Metrica
              Icone={IconeDocumento}
              detalhe={DEMO ? "Exercícios locais; nenhum modelo executado" : `${metricas.analisesComIA} com leitura dos documentos por IA`}
              rotulo="Análises"
              valor={metricas.total.toLocaleString("pt-BR")}
            />
            <Metrica
              Icone={IconeBalanca}
              detalhe="Pela faixa de custo anual do Tema 1234"
              rotulo="Justiça"
              valor={`${metricas.porJustica.federal} Federal · ${metricas.porJustica.estadual} Estadual`}
              valorMenor
            />
            <Metrica
              Icone={IconeOk}
              detalhe={
                metricas.percentualApto === null
                  ? "Nenhuma análise com leitura por IA ainda"
                  : DEMO ? "Dos exercícios com resposta preparada" : "Das análises com IA, com os seis requisitos localizados"
              }
              rotulo="Seis requisitos com evidência"
              valor={
                metricas.percentualApto === null
                  ? "—"
                  : `${metricas.percentualApto.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
              }
            />
            <Metrica
              Icone={IconeRevisao}
              detalhe={
                metricas.requisitoQueMaisReprova
                  ? `Pendente em ${metricas.requisitoQueMaisReprova.vezes} análise(s)`
                  : "Nenhuma pendência registrada"
              }
              rotulo="Requisito mais pendente"
              valor={
                metricas.requisitoQueMaisReprova
                  ? tituloDoRequisito(metricas.requisitoQueMaisReprova.id)
                  : "—"
              }
              valorMenor
            />
            <Metrica
              Icone={IconeCalculadora}
              detalhe="Preço da apresentação vezes a posologia"
              rotulo="Custo anual mediano"
              valor={metricas.custoAnualMediano === null ? "—" : brl(metricas.custoAnualMediano)}
              valorMenor
            />
          </section>

          <section aria-labelledby="titulo-historico" className="mt-8">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="fonte-display text-lg font-bold" id="titulo-historico">
                Últimas análises
              </h2>
              <p className="text-xs text-muted">
                {DEMO ? "Exemplos mantidos somente na memória desta aba." : "Documentos e trechos citados não são guardados, por privacidade."}
              </p>
            </div>

            <div className="cartao contain-[paint] overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-[var(--border)] text-[0.6875rem] uppercase tracking-[0.0625rem] text-muted">
                  <tr>
                    <th className="px-5 py-3 font-bold" scope="col">Caso</th>
                    <th className="px-5 py-3 font-bold" scope="col">Medicamento</th>
                    <th className="px-5 py-3 text-right font-bold" scope="col">Custo anual</th>
                    <th className="px-5 py-3 font-bold" scope="col">Justiça</th>
                    <th className="px-5 py-3 font-bold" scope="col">Requisitos</th>
                    <th className="px-5 py-3" scope="col">
                      <span className="sr-only">Ação</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-5 py-3.5 align-top">
                        <span className="fonte-display block font-bold">{item.codigo}</span>
                        <span className="num text-xs text-muted">
                          {dataCurta(item.criadoEm)} · {hora(item.criadoEm)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-top">{item.medicamento}</td>
                      <td className="num px-5 py-3.5 text-right align-top">
                        {brl(item.custoAnual)}
                        <span className="block text-xs text-muted">{sm(item.emSalariosMinimos)}</span>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        Justiça {item.justica === "federal" ? "Federal" : "Estadual"}
                        <span className="block text-xs text-muted">{FAIXAS[item.faixa] ?? ""}</span>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <Situacao item={item} />
                      </td>
                      <td className="px-5 py-3.5 text-right align-top">
                        <Button
                          aria-label={`Abrir ${item.codigo}`}
                          className="controle"
                          isDisabled={abrindo !== null}
                          variant="secondary"
                          onPress={() => onAbrir(item.id)}
                        >
                          {abrindo === item.id ? <Spinner size="sm" /> : "Abrir"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {proximo !== null && (
              <Button
                className="controle mt-4"
                isDisabled={carregandoMais}
                variant="secondary"
                onPress={() => void carregarMais()}
              >
                {carregandoMais ? "Carregando…" : "Carregar mais análises"}
              </Button>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Metrica({
  rotulo,
  valor,
  detalhe,
  Icone,
  valorMenor = false,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  Icone: (p: { className?: string }) => React.ReactNode;
  /** Texto longo (nome de requisito, valor em reais) cabe melhor menor. */
  valorMenor?: boolean;
}) {
  return (
    <article className="cartao flex flex-col gap-2 px-5 py-4">
      <p className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.0625rem] text-[#356149]">
        <Icone className="size-4 shrink-0" />
        {rotulo}
      </p>
      <p
        className={`num fonte-display font-bold leading-tight ${valorMenor ? "text-lg" : "text-[2rem]"}`}
      >
        {valor}
      </p>
      <p className="text-xs leading-relaxed text-muted">{detalhe}</p>
    </article>
  );
}

/**
 * Situação do caso. Verde descreve evidência localizada nos documentos, nunca
 * aprovação jurídica — por isso o rótulo conta requisitos, não diz "aprovado".
 */
function Situacao({ item }: { item: ItemHistorico }) {
  if (item.aptoParaProtocolo === null || !item.placar) {
    return <Selo classe={ESTADOS.nao_avaliado.classe} rotulo="Só o motor de regras" />;
  }
  if (item.aptoParaProtocolo) {
    return <Selo classe={ESTADOS.ok.classe} rotulo={`${item.placar.ok} de ${item.placar.total} com evidência`} />;
  }
  const pendentes = item.placar.total - item.placar.ok;
  return (
    <Selo
      classe={ESTADOS.fraco.classe}
      rotulo={`${pendentes} pendente(s) · ${item.placar.ok} de ${item.placar.total} com evidência`}
    />
  );
}

function Selo({ classe, rotulo }: { classe: string; rotulo: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[0.375rem] border px-2 py-[0.3125rem] text-[0.6875rem] leading-[1.5] ${classe}`}
    >
      <span aria-hidden="true" className="ponto-estado" />
      {rotulo}
    </span>
  );
}
