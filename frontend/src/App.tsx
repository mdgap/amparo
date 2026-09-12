import { useEffect, useState } from "react";
import { Alert, Spinner } from "@heroui/react";
import { FormularioCaso } from "./components/FormularioCaso.tsx";
import { PainelRota } from "./components/PainelRota.tsx";
import { PainelTema6 } from "./components/PainelTema6.tsx";
import { PainelDossie } from "./components/PainelDossie.tsx";
import { api, type Analise, type EntradaCaso, type RequisitoTema6 } from "./lib/api.ts";

export function App() {
  const [catalogo, setCatalogo] = useState<RequisitoTema6[]>([]);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.requisitos().then((r) => setCatalogo(r.requisitos)).catch(() => {});
  }, []);

  async function analisar(entrada: EntradaCaso) {
    setCarregando(true);
    setErro(null);
    try {
      setAnalise(await api.analisar(entrada));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha inesperada");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">MindTheGap</h1>
        <p className="text-muted">
          Triagem de pedidos de medicamento ao SUS: rota processual pelo Tema 1234
          e conferência dos requisitos do Tema 6, com fonte oficial em cada afirmação.
        </p>
      </header>

      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Ferramenta de apoio, não de decisão</Alert.Title>
          <Alert.Description>
            As saídas são minutas revisáveis e precisam da conferência do advogado.
            Use apenas dados anonimizados: sem nome, sem CPF.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      <FormularioCaso carregando={carregando} onAnalisar={analisar} />

      {erro && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Não foi possível analisar</Alert.Title>
            <Alert.Description>{erro}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {carregando && (
        <div className="flex items-center gap-3 text-muted">
          <Spinner size="sm" /> Lendo o corpus e redigindo o dossiê…
        </div>
      )}

      {analise && (
        <>
          <PainelRota rota={analise.rota} />
          {analise.aviso && (
            <Alert status="accent">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Etapa de IA desligada</Alert.Title>
                <Alert.Description>{analise.aviso}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          {analise.tema6 && <PainelTema6 catalogo={catalogo} tema6={analise.tema6} />}
          {analise.dossie && <PainelDossie dossie={analise.dossie} />}
          <footer className="text-xs text-muted">
            Parâmetros {analise.parametrosVersao}. Conteúdo gerado por IA sobre corpus
            oficial — confira cada citação antes de protocolar.
          </footer>
        </>
      )}
    </div>
  );
}
