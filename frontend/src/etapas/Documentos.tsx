import { useRef, useState } from "react";
import { Alert, Button, TextArea } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import { IconeOk, IconeSeta, IconeUpload } from "../components/Icones.tsx";
import { BuscaNatJus } from "../components/BuscaNatJus.tsx";
import { api } from "../lib/api.ts";
import {
  CAMPOS_DOCUMENTO, CASO_EXEMPLO, temCpf, type Documentos as Docs,
} from "../lib/caso.ts";

interface Props {
  documentos: Docs;
  onMudar: (documentos: Docs) => void;
  onExemplo: () => void;
  onAvancar: () => void;
}

export function Documentos({ documentos, onMudar, onExemplo, onAvancar }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const completos = CAMPOS_DOCUMENTO.filter(
    (c) => c.obrigatorio && documentos[c.id].trim(),
  ).length;
  const obrigatorios = CAMPOS_DOCUMENTO.filter((c) => c.obrigatorio).length;

  function avancar() {
    if (temCpf(documentos)) {
      setErro(
        "Há um CPF nos documentos. Remova os dados que identificam a paciente — a ferramenta trabalha sem identificação.",
      );
      return;
    }
    setErro(null);
    onAvancar();
  }

  return (
    <>
      <Cabecalho
        descricao="Envie ou cole o texto de cada peça. Use apenas documentos anonimizados: sem nome, sem CPF, sem número de cartão do SUS."
        passo="Etapa 1 de 4"
        titulo="Documentos do caso"
      />

      {erro && (
        <Alert className="mb-6" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Dado pessoal encontrado</Alert.Title>
            <Alert.Description>{erro}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {CAMPOS_DOCUMENTO.map((campo) => (
          <CampoDocumento
            key={campo.id}
            ajuda={campo.ajuda}
            buscaNatJus={campo.id === "notaENatJus"}
            obrigatorio={campo.obrigatorio}
            rotulo={campo.rotulo}
            valor={documentos[campo.id]}
            onMudar={(v) => onMudar({ ...documentos, [campo.id]: v })}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
        <Button className="controle" isDisabled={completos === 0} onPress={avancar}>
          Conferir informações
          <IconeSeta className="size-5" />
        </Button>
        <Button className="controle" variant="secondary" onPress={onExemplo}>
          Carregar caso sintético
        </Button>
        <p className="text-sm text-muted">
          {completos} de {obrigatorios} documentos obrigatórios preenchidos
        </p>
      </div>

      <p className="mt-4 text-sm text-muted">
        O texto dos documentos é usado apenas durante a análise e não é
        armazenado. O caso sintético serve para demonstração.
      </p>
    </>
  );
}

function CampoDocumento({
  rotulo, ajuda, obrigatorio, valor, buscaNatJus = false, onMudar,
}: {
  rotulo: string;
  ajuda: string;
  obrigatorio: boolean;
  valor: string;
  buscaNatJus?: boolean;
  onMudar: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const preenchido = valor.trim().length > 0;

  const [lendo, setLendo] = useState(false);
  const [avisoDoArquivo, setAvisoDoArquivo] = useState<string | null>(null);

  /**
   * PDF é lido no servidor: o digital sai por extração e o digitalizado por
   * OCR, sem sair da infraestrutura. Texto puro continua sendo lido aqui mesmo.
   */
  async function lerArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setAvisoDoArquivo(null);
    if (!arquivo.name.toLowerCase().endsWith(".pdf")) {
      onMudar(await arquivo.text());
      return;
    }
    setLendo(true);
    try {
      const r = await api.documento(arquivo);
      onMudar(r.texto);
      setAvisoDoArquivo(
        r.origem === "ocr"
          ? `PDF digitalizado: texto obtido por OCR (${r.paginas} pág., confiança ${r.confianca}%). Confira antes de seguir — OCR erra.`
          : `PDF lido: ${r.paginas} página(s).`,
      );
    } catch (e) {
      setAvisoDoArquivo(e instanceof Error ? e.message : "Falha ao ler o PDF.");
    } finally {
      setLendo(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-surface p-6">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="fonte-display text-lg font-semibold">{rotulo}</h2>
        {obrigatorio && !preenchido && (
          <span className="text-sm text-muted">obrigatório</span>
        )}
        {preenchido && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-ok-bg)] px-2.5 py-0.5 text-sm font-medium text-[var(--status-ok-fg)]">
            <IconeOk className="size-4" />
            {valor.trim().length} caracteres
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">{ajuda}</p>

      {buscaNatJus && <BuscaNatJus onImportar={onMudar} />}

      <div
        className={`mb-3 flex items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-4 text-sm transition-colors
          ${arrastando ? "border-[var(--color-marca)] bg-[var(--status-ok-bg)]" : "border-[var(--border)] bg-[var(--surface-secondary)]"}`}
        onDragLeave={() => setArrastando(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          void lerArquivo(e.dataTransfer.files[0]);
        }}
      >
        <IconeUpload className="size-5 text-muted" />
        <span className="text-muted">
          {lendo ? "Lendo o documento…" : "Arraste um PDF ou .txt, ou"}
        </span>
        <Button
          isDisabled={lendo}
          size="sm"
          variant="secondary"
          onPress={() => inputRef.current?.click()}
        >
          escolher arquivo
        </Button>
        <input
          ref={inputRef}
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className="hidden"
          type="file"
          onChange={(e) => void lerArquivo(e.target.files?.[0])}
        />
      </div>

      {avisoDoArquivo && (
        <p className="mb-3 text-sm text-muted">{avisoDoArquivo}</p>
      )}

      <TextArea
        aria-label={rotulo}
        className="h-32 w-full"
        placeholder="Ou cole o texto aqui"
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
      />
    </section>
  );
}
