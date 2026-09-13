import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { ROTULO, usePontosDeIA } from "../components/AjudaIA.tsx";
import { IconeEscudo, IconeSeta } from "../components/Icones.tsx";
import { api, brl, PASSOS_DA_ANALISE } from "../lib/api.ts";

interface Props {
  onNovoCaso: () => void;
}

/** O que a anonimização e a guarda de dados garantem — descrito como está no código. */
const PROTECAO = [
  {
    titulo: "Anonimização antes de tudo",
    texto:
      "Nome, CPF, cartão do SUS, CNPJ, CEP, CRM, telefone, e-mail e local viram marcador ([NOME], [CPF], [CARTAO SUS]) antes de qualquer outra etapa. Roda num serviço próprio, na nossa infraestrutura: o texto identificado não sai daqui.",
  },
  {
    titulo: "Marcador, não apagamento",
    texto:
      "O Tema 6 exige laudo com CRM e histórico de tratamentos com datas. Por isso o dado vira marcador em vez de sumir, e datas não são anonimizadas: são prova. Nomes de medicamento da lista da CMED são preservados.",
  },
  {
    titulo: "Falha fechada",
    texto:
      "Se o anonimizador não responder, o documento é recusado e nada é processado. Devolver texto identificado em silêncio seria pior do que não funcionar.",
  },
  {
    titulo: "O que fica guardado",
    texto:
      "Guardamos os dados do caso (medicamento, preço e posologia), a rota calculada, a situação de cada requisito e as minutas. Não guardamos os documentos, os trechos citados, as justificativas do modelo nem os prompts, e os erros não registram texto de documento.",
  },
  {
    titulo: "Arquivos",
    texto:
      "PDFs são lidos em memória. Os digitalizados passam por OCR no próprio servidor, e o arquivo temporário é apagado ao fim da leitura.",
  },
  {
    titulo: "Ao chegar no modelo de linguagem",
    texto:
      "O texto enviado ao modelo já está anonimizado. O acesso é pela OpenRouter com Zero Data Retention: o provedor não guarda o que recebe.",
  },
];

/** Compromissos do produto, os mesmos invariantes que o código segue. */
const COMPROMISSOS = [
  {
    titulo: "Número nunca sai do modelo",
    texto:
      "Custo anual, salários mínimos, foro e polo passivo são contas em código. O modelo recebe os números prontos e só os repete.",
  },
  {
    titulo: "Toda afirmação jurídica cita fonte",
    texto:
      "Cada fundamento aponta um trecho do corpus oficial ([F1], [F2]). Sem trecho que sustente, a saída diz “sem fonte no corpus”.",
  },
  {
    titulo: "Ausência de prova é pendência",
    texto:
      "Requisito não avaliado nunca conta como aprovado: ele entra como pendência e bloqueia o protocolo.",
  },
];

/**
 * Sobre nós: como o projeto funciona.
 *
 * O conteúdo que muda com o código vem do próprio sistema — os passos da
 * análise, o catálogo de onde entra IA e os parâmetros em vigor —, para esta
 * tela não descrever uma versão que já não existe.
 */
export function Sobre({ onNovoCaso }: Props) {
  const pontos = usePontosDeIA();
  const [ambiente, setAmbiente] = useState<{
    versao: string;
    salarioMinimo: number;
  } | null>(null);

  useEffect(() => {
    api
      .requisitos()
      .then((r) =>
        setAmbiente({
          versao: r.parametros.versao,
          salarioMinimo: r.parametros.salarioMinimo.valorMensal,
        }),
      )
      .catch(() => setAmbiente(null));
  }, []);

  return (
    <>
      <Cabecalho
        acao={
          <Button className="controle" onPress={onNovoCaso}>
            Começar um caso
            <IconeSeta className="size-5" />
          </Button>
        }
        descricao="Triagem de ações de medicamento contra o SUS. O advogado envia os documentos do caso; o Amparo calcula a rota processual pelo Tema 1234, confere os seis requisitos do Tema 6 com fonte oficial e redige as minutas para revisão."
        passo="Sobre nós"
        secao={null}
        titulo="Como o Amparo funciona"
      />

      <section aria-labelledby="sobre-caminho">
        <h2 className="fonte-display mb-3 text-lg font-bold" id="sobre-caminho">
          O caminho de um caso
        </h2>
        <ol className="cartao divide-y divide-[var(--border)]">
          {PASSOS_DA_ANALISE.map((passo, i) => (
            <li key={passo.id} className="flex gap-4 px-5 py-4">
              <span className="num fonte-display pt-0.5 text-sm font-bold text-[#356149]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="fonte-display font-bold">{passo.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{passo.enquanto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sobre-dados" className="mt-10">
        <h2 className="fonte-display mb-1 flex items-center gap-2 text-lg font-bold" id="sobre-dados">
          <IconeEscudo className="size-5 text-[#356149]" />
          Como protegemos os dados do paciente
        </h2>
        <p className="mb-4 max-w-[50rem] text-sm leading-relaxed text-muted">
          O Amparo trabalha sem identificar o paciente. Isto é o que o sistema
          faz com cada documento enviado.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {PROTECAO.map((item) => (
            <article key={item.titulo} className="cartao px-5 py-4">
              <h3 className="fonte-display font-bold">{item.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="sobre-ia" className="mt-10">
        <h2 className="fonte-display mb-1 text-lg font-bold" id="sobre-ia">
          Onde entra IA e onde não entra
        </h2>
        <p className="mb-4 max-w-[50rem] text-sm leading-relaxed text-muted">
          Cada ponto abaixo é lido do código do sistema, com a natureza de cada
          etapa: modelo de linguagem, regra determinística ou modelo local.
        </p>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {COMPROMISSOS.map((c) => (
            <article key={c.titulo} className="rounded-2xl border border-[#c9dbd0] bg-[#edf4ef] px-5 py-4">
              <h3 className="fonte-display font-bold text-[#1f4a31]">{c.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#2f5a41]">{c.texto}</p>
            </article>
          ))}
        </div>

        {pontos === null && <p className="text-sm text-muted">Carregando o catálogo…</p>}
        {pontos !== null && pontos.size === 0 && (
          <p className="text-sm text-muted">O catálogo não está disponível agora.</p>
        )}
        {pontos !== null && pontos.size > 0 && (
          <ul className="cartao divide-y divide-[var(--border)]">
            {[...pontos.values()].map((ponto) => {
              const { texto, Icone } = ROTULO[ponto.natureza];
              return (
                <li key={ponto.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="fonte-display font-bold">{ponto.titulo}</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-[0.375rem] border border-[#d7ded9] bg-[#eef1ef] px-2 py-[0.3125rem] text-[0.6875rem] leading-[1.5] text-[#536259]">
                      <Icone className="size-3.5" />
                      {texto}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{ponto.oQueFaz}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    <strong className="font-semibold text-foreground">Limite: </strong>
                    {ponto.limites}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="sobre-limites" className="mt-10">
        <h2 className="fonte-display mb-3 text-lg font-bold" id="sobre-limites">
          Limites
        </h2>
        <ul className="cartao flex flex-col gap-3 px-5 py-4 text-sm leading-relaxed">
          <li>
            <strong className="font-semibold">Ferramenta de apoio à triagem.</strong>{" "}
            As saídas são minutas revisáveis e não substituem a conferência do
            advogado responsável.
          </li>
          {ambiente && (
            <li className="num text-muted">
              Parâmetros em vigor: versão {ambiente.versao}, salário mínimo de{" "}
              {brl(ambiente.salarioMinimo)}.
            </li>
          )}
        </ul>
      </section>
    </>
  );
}
