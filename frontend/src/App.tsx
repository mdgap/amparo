import { useEffect, useState } from "react";
import { Alert, Spinner } from "@heroui/react";
import { Shell, type EtapaId } from "./components/Shell.tsx";
import { Documentos } from "./etapas/Documentos.tsx";
import { Conferencia } from "./etapas/Conferencia.tsx";
import { Achados } from "./etapas/Achados.tsx";
import { DossieEtapa } from "./etapas/DossieEtapa.tsx";
import { api, type Analise, type RequisitoTema6 } from "./lib/api.ts";
import {
  CASO_EXEMPLO, DOCUMENTOS_VAZIOS, MEDICAMENTO_VAZIO,
  type DadosMedicamento, type Documentos as Docs,
} from "./lib/caso.ts";

export function App() {
  const [etapa, setEtapa] = useState<EtapaId>("documentos");
  const [documentos, setDocumentos] = useState<Docs>(DOCUMENTOS_VAZIOS);
  const [medicamento, setMedicamento] = useState<DadosMedicamento>(MEDICAMENTO_VAZIO);
  const [catalogo, setCatalogo] = useState<RequisitoTema6[]>([]);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.requisitos().then((r) => setCatalogo(r.requisitos)).catch(() => {});
  }, []);

  const liberadas = new Set<EtapaId>(["documentos"]);
  if (documentos.laudo.trim() || documentos.requerimentoAdministrativo.trim()) {
    liberadas.add("conferencia");
  }
  if (analise) liberadas.add("achados");
  if (analise?.dossie) liberadas.add("dossie");

  async function analisar() {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await api.analisar({
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
      });
      setAnalise(resultado);
      setEtapa("achados");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada na análise.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Shell etapa={etapa} liberadas={liberadas} onIr={setEtapa}>
      {erro && (
        <Alert className="mb-6" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Não foi possível concluir a análise</Alert.Title>
            <Alert.Description>{erro}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {carregando && (
        <div
          aria-live="polite"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-surface px-6 py-4"
        >
          <Spinner size="sm" />
          <span>Lendo os documentos e conferindo o corpus normativo…</span>
        </div>
      )}

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
          onVoltar={() => setEtapa("conferencia")}
        />
      )}

      {etapa === "dossie" && analise?.dossie && (
        <DossieEtapa
          aptoParaProtocolo={analise.tema6?.resumo.aptoParaProtocolo ?? false}
          dossie={analise.dossie}
          onVoltar={() => setEtapa("achados")}
        />
      )}

      <footer className="mt-10 border-t border-[var(--border)] pt-6 text-sm text-muted">
        Ferramenta de apoio à triagem. As saídas são minutas revisáveis, não
        substituem a conferência do advogado responsável, e o verde nos achados
        indica evidência localizada no documento — nunca aprovação jurídica.
      </footer>
    </Shell>
  );
}
