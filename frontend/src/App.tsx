import { useEffect, useState } from "react";
import { Alert, Spinner } from "@heroui/react";
import { Shell, type EtapaId } from "./components/Shell.tsx";
import { Painel } from "./etapas/Painel.tsx";
import { Sobre } from "./etapas/Sobre.tsx";
import { Documentos } from "./etapas/Documentos.tsx";
import { Conferencia } from "./etapas/Conferencia.tsx";
import { Achados } from "./etapas/Achados.tsx";
import { DossieEtapa } from "./etapas/DossieEtapa.tsx";
import { Progresso } from "./components/Progresso.tsx";
import { ProvedorDeAjuda } from "./components/AjudaIA.tsx";
import {
  api, type Analise, type Passo, type PassoId, type RequisitoTema6,
} from "./lib/api.ts";
import { historicoApi } from "./lib/historico.ts";
import {
  CASO_EXEMPLO, DOCUMENTOS_VAZIOS, MEDICAMENTO_VAZIO, PROCESSUAIS_VAZIOS,
  type DadosMedicamento, type DadosProcessuais, type Documentos as Docs,
} from "./lib/caso.ts";

export function App() {
  const [etapa, setEtapa] = useState<EtapaId>("painel");
  const [documentos, setDocumentos] = useState<Docs>(DOCUMENTOS_VAZIOS);
  const [medicamento, setMedicamento] = useState<DadosMedicamento>(MEDICAMENTO_VAZIO);
  const [processuais, setProcessuais] = useState<DadosProcessuais>(PROCESSUAIS_VAZIOS);
  const [catalogo, setCatalogo] = useState<RequisitoTema6[]>([]);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [passos, setPassos] = useState<Map<PassoId, Passo>>(new Map());
  const [erro, setErro] = useState<{ titulo: string; mensagem: string } | null>(null);
  /** Id da análise do histórico que está sendo reaberta. */
  const [abrindo, setAbrindo] = useState<number | null>(null);
  /** Preenchido quando a análise na tela veio do histórico, não de uma leitura agora. */
  const [reaberta, setReaberta] = useState<{ codigo: string; criadoEm: string } | null>(null);

  useEffect(() => {
    api.requisitos().then((r) => setCatalogo(r.requisitos)).catch(() => {});
  }, []);

  const liberadas = new Set<EtapaId>(["painel", "sobre", "documentos"]);
  if (documentos.laudo.trim() || documentos.requerimentoAdministrativo.trim()) {
    liberadas.add("conferencia");
  }
  if (analise) liberadas.add("achados");
  if (analise?.dossie) liberadas.add("dossie");

  function limparCaso() {
    setDocumentos(DOCUMENTOS_VAZIOS);
    setMedicamento(MEDICAMENTO_VAZIO);
    setProcessuais(PROCESSUAIS_VAZIOS);
    setAnalise(null);
    setReaberta(null);
    setPassos(new Map());
    setErro(null);
  }

  function novoCaso() {
    limparCaso();
    setEtapa("documentos");
  }

  async function abrir(id: number) {
    setAbrindo(id);
    setErro(null);
    try {
      const salva = await historicoApi.analise(id);
      limparCaso();
      setAnalise(salva);
      setReaberta({ codigo: salva.codigo, criadoEm: salva.criadoEm });
      setEtapa("achados");
    } catch (e) {
      setErro({
        titulo: "Não foi possível abrir a análise",
        mensagem: e instanceof Error ? e.message : "Falha inesperada ao ler o histórico.",
      });
    } finally {
      setAbrindo(null);
    }
  }

  async function analisar() {
    setCarregando(true);
    setErro(null);
    setPassos(new Map());
    try {
      const resultado = await api.analisarComProgresso({
        medicamento: {
          nome: medicamento.nome,
          precoApresentacao: medicamento.precoApresentacao,
          precoOrigem: medicamento.precoOrigem,
          unidadesPorApresentacao: medicamento.unidadesPorApresentacao,
          registroAnvisa: { possui: medicamento.comRegistroAnvisa },
        },
        posologia: {
          unidadesPorTomada: medicamento.unidadesPorTomada,
          tomadasPorDia: medicamento.tomadasPorDia,
          diasPorAno: medicamento.diasPorAno,
        },
        documentos,
        conitec: {
          situacao: processuais.conitec.situacao,
          desde: processuais.conitec.desde || undefined,
          ilegalidadeDemonstrada: processuais.conitec.ilegalidadeDemonstrada,
        },
        hipossuficiencia: processuais.hipossuficiencia,
      }, (passo) => setPassos((atual) => new Map(atual).set(passo.id, passo)));
      setAnalise(resultado);
      setReaberta(null);
      setEtapa("achados");
    } catch (e) {
      setErro({
        titulo: "Não foi possível concluir a análise",
        mensagem: e instanceof Error ? e.message : "Falha inesperada na análise.",
      });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ProvedorDeAjuda>
    <Shell etapa={etapa} liberadas={liberadas} onIr={setEtapa}>
      {/* Avisos acima do cabeçalho da tela. O <main> não tem respiro no topo
          (quem dá é o Cabeçalho), então o bloco traz o próprio. */}
      {(erro || carregando || (reaberta && (etapa === "achados" || etapa === "dossie"))) && (
      <div className="flex flex-col gap-4 pt-6 lg:pt-8">
      {erro && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{erro.titulo}</Alert.Title>
            <Alert.Description>{erro.mensagem}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {carregando && (
        <div aria-live="polite">
          <Progresso passos={passos} />
        </div>
      )}

      {reaberta && (etapa === "achados" || etapa === "dossie") && (
        <Alert status="accent">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{reaberta.codigo}, reaberto do histórico</Alert.Title>
            <Alert.Description>
              Análise de{" "}
              {new Date(reaberta.criadoEm).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "long", year: "numeric",
              })}
              . Os documentos e os trechos citados não são guardados, por
              privacidade: os achados mostram a situação de cada requisito, e o
              dossiê está como foi redigido. Para ler os documentos de novo,
              comece um caso novo.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      </div>
      )}

      {etapa === "painel" && (
        <Painel
          abrindo={abrindo}
          catalogo={catalogo}
          onAbrir={(id) => void abrir(id)}
          onNovoCaso={novoCaso}
        />
      )}

      {etapa === "sobre" && <Sobre onNovoCaso={novoCaso} />}

      {etapa === "documentos" && (
        <Documentos
          documentos={documentos}
          onAvancar={() => setEtapa("conferencia")}
          onExemplo={() => {
            setDocumentos(CASO_EXEMPLO.documentos);
            setMedicamento(CASO_EXEMPLO.medicamento);
          }}
          onMudar={setDocumentos}
        />
      )}

      {etapa === "conferencia" && (
        <Conferencia
          documentos={documentos}
          processuais={processuais}
          onMudarProcessuais={setProcessuais}
          carregando={carregando}
          medicamento={medicamento}
          onAnalisar={() => void analisar()}
          onMudar={setMedicamento}
          onVoltar={() => setEtapa("documentos")}
        />
      )}

      {etapa === "achados" && analise && (
        <Achados
          analise={analise}
          catalogo={catalogo}
          documentos={documentos}
          onVerDossie={() => setEtapa("dossie")}
          onVoltar={() => setEtapa(reaberta ? "painel" : "conferencia")}
        />
      )}

      {etapa === "dossie" && analise?.dossie && (
        <DossieEtapa
          aptoParaProtocolo={analise.tema6?.resumo.aptoParaProtocolo ?? false}
          dossie={analise.dossie}
          onVoltar={() => setEtapa("achados")}
        />
      )}

      {abrindo !== null && (
        <p aria-live="polite" className="sr-only">
          Abrindo a análise…
        </p>
      )}

      <footer className="mt-10 border-t border-[var(--border)] pt-6 text-sm text-muted">
        Ferramenta de apoio à triagem. As saídas são minutas revisáveis, não
        substituem a conferência do advogado responsável, e o verde nos achados
        indica evidência localizada no documento — nunca aprovação jurídica.
      </footer>
    </Shell>
    </ProvedorDeAjuda>
  );
}
