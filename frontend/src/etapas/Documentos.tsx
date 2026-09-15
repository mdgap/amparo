import { useId, useRef, useState } from "react";
import { Alert, Button, TextArea } from "@heroui/react";
import { Cabecalho } from "../components/Cabecalho.tsx";
import {
  IconeDocumento, IconeEscudo, IconeOk, IconeSeta, IconeUpload,
} from "../components/Icones.tsx";
import { BuscaNatJus } from "../components/BuscaNatJus.tsx";
import { api } from "../lib/api.ts";
import { DEMO } from "../demo/ativo.ts";
import { cenarioAtual } from "../demo/api.ts";
import { baixarExemplo } from "../demo/download.ts";
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
        "Há um CPF nos documentos. Remova os dados que identificam a paciente. A ferramenta trabalha sem identificação.",
      );
      return;
    }
    setErro(null);
    onAvancar();
  }

  return (
    <>
      <Cabecalho
        descricao={DEMO ? "Documentos fictícios já preenchidos. O envio de arquivo demonstra a interação e carrega um exemplo, sem ler ou transmitir seu arquivo." : "Envie ou cole o texto de cada peça do caso. Laudo e pedido administrativo são obrigatórios."}
        passo="Etapa 1 de 4"
        etapaAtual={1}
        titulo="Documentos do caso"
      />

      {erro && (
        <Alert className="mb-5" status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Dado pessoal encontrado</Alert.Title>
            <Alert.Description>{erro}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <p className="mb-5 flex items-center gap-3 rounded-[0.5625rem] border border-[var(--border)] bg-[#eaf1ed] px-4 py-3 text-xs text-[#214832]">
        <IconeEscudo className="size-[1.125rem] shrink-0" />
        {DEMO ? "A demo usa apenas exemplos preparados. Nenhum serviço de anonimização é executado. Use os downloads para conhecer os documentos fictícios." : <>Os documentos são anonimizados automaticamente: nome, CPF, cartão do SUS
        e contatos viram marcadores antes de qualquer análise.
        </>}
      </p>

      {/* Os dois obrigatórios ficam lado a lado; os opcionais, abaixo. */}
      <div className="grid gap-[1.125rem] lg:grid-cols-2">
        {CAMPOS_DOCUMENTO.filter((c) => c.obrigatorio).map((campo) => (
          <CampoDocumento
            key={campo.id}
            campo={campo.id}
            ajuda={campo.ajuda}
            obrigatorio
            rotulo={campo.rotulo}
            valor={documentos[campo.id]}
            onMudar={(v) => onMudar({ ...documentos, [campo.id]: v })}
          />
        ))}
      </div>

      <div className="mt-[1.125rem] grid gap-[1.125rem] lg:grid-cols-2">
        {CAMPOS_DOCUMENTO.filter((c) => !c.obrigatorio).map((campo) => (
          <CampoDocumento
            key={campo.id}
            campo={campo.id}
            ajuda={campo.ajuda}
            buscaNatJus={campo.id === "notaENatJus"}
            obrigatorio={false}
            rotulo={campo.rotulo}
            valor={documentos[campo.id]}
            onMudar={(v) => onMudar({ ...documentos, [campo.id]: v })}
          />
        ))}
      </div>

      <div className="barra-acao mt-6 flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button className="controle" isDisabled={completos === 0} onPress={avancar}>
            Conferir informações
            <IconeSeta className="size-[1.0625rem]" />
          </Button>
          <Button className="controle" variant="secondary" onPress={onExemplo}>
            Carregar caso sintético
          </Button>
        </div>
        <p className="flex items-center gap-2 text-xs text-[#3f5648]">
          <IconeOk className="size-4 text-[#177948]" />
          <span>
            <strong className="font-medium text-foreground">{completos}</strong> de{" "}
            {obrigatorios} documentos obrigatórios preenchidos
          </span>
        </p>
      </div>

      <p className="mt-5 max-w-[59rem] text-[0.625rem] leading-relaxed text-muted">
        {DEMO ? "Os exemplos ficam na memória desta aba. As respostas documentais são preparadas e não mudam por interpretação de texto. Arquivos selecionados são ignorados." : <>O texto dos documentos é usado apenas durante a análise e não é
        armazenado. Nome, CPF, cartão do SUS e contato são substituídos por
        marcador antes de qualquer envio ao modelo. O caso sintético serve para
        demonstração.
        </>}
      </p>
    </>
  );
}

function CampoDocumento({
  rotulo, ajuda, obrigatorio, valor, campo, buscaNatJus = false, onMudar,
}: {
  rotulo: string;
  ajuda: string;
  obrigatorio: boolean;
  valor: string;
  campo: keyof Docs;
  buscaNatJus?: boolean;
  onMudar: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const campoId = useId();
  const [arrastando, setArrastando] = useState(false);
  const preenchido = valor.trim().length > 0;

  const [lendo, setLendo] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [avisoDoArquivo, setAvisoDoArquivo] = useState<string | null>(null);

  /**
   * PDF é lido no servidor: o digital sai por extração e o digitalizado por
   * OCR, sem sair da infraestrutura. Texto puro continua sendo lido aqui mesmo.
   */
  async function lerArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setAvisoDoArquivo(null);
    if (!DEMO && !arquivo.name.toLowerCase().endsWith(".pdf")) {
      onMudar(await arquivo.text());
      return;
    }
    setLendo(true);
    try {
      const r = await api.documento(arquivo, campo);
      onMudar(r.texto);
      setAvisoDoArquivo(
        DEMO ? "Envio simulado concluído. Seu arquivo não foi lido nem enviado; o texto abaixo pertence ao cenário fictício." : r.origem === "ocr"
          ? `PDF digitalizado: texto obtido por OCR (${r.paginas} pág., confiança ${r.confianca}%). Confira antes de seguir: OCR erra.`
          : `PDF lido: ${r.paginas} página(s).`,
      );
    } catch (e) {
      setAvisoDoArquivo(e instanceof Error ? e.message : "Falha ao ler o PDF.");
    } finally {
      setLendo(false);
    }
  }

  return (
    <section className="cartao p-[1.375rem]">
      <div className="mb-2 flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="icone-secao">
            <IconeDocumento className="size-5" />
          </span>
          <h2 className="fonte-display truncate text-[1.125rem] font-bold tracking-[-0.022rem]">
            {rotulo}
          </h2>
        </div>
        <span
          className={`whitespace-nowrap rounded-[0.3125rem] px-[0.4375rem] py-1 text-[0.625rem] ${
            obrigatorio
              ? "bg-[var(--foreground)] text-white"
              : "bg-[#f0f2f1] text-[#59665e]"
          }`}
        >
          {obrigatorio ? "Obrigatório" : "Opcional"}
        </span>
      </div>
      <p className="mb-4 min-h-[1.1875rem] text-xs text-muted">{ajuda}</p>

      {buscaNatJus && <BuscaNatJus onImportar={onMudar} />}

      {DEMO && <Button className="mb-3" size="sm" variant="secondary" isPending={baixando} onPress={async () => {
        setBaixando(true);
        try { await baixarExemplo(cenarioAtual().documentos[campo] || "O cenário não inclui este documento.", campo); }
        finally { setBaixando(false); }
      }}>Baixar exemplo fictício</Button>}

      <div
        className={`flex items-center gap-2.5 rounded-[0.5625rem] border border-dashed px-3 py-3 transition-colors
          ${arrastando ? "border-[var(--color-marca)] bg-[var(--status-ok-bg)]" : "border-[#9db5a8] bg-[#f7faf8]"}`}
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
        <IconeUpload className="size-5 shrink-0 text-[#347552]" />
        <div className="min-w-0 flex-1">
          <span className="block text-xs text-[#224732]">
            {lendo ? "Lendo o documento…" : "Arraste um PDF ou .txt"}
          </span>
          <small className="block text-[0.625rem] text-muted">
            ou selecione no seu computador
          </small>
        </div>
        <Button
          isDisabled={lendo}
          size="sm"
          variant="secondary"
          onPress={() => inputRef.current?.click()}
        >
          Escolher arquivo
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
        <p className="mt-3 text-xs text-muted">{avisoDoArquivo}</p>
      )}

      <div className="mb-[0.4375rem] mt-3.5 flex items-center justify-between gap-2">
        <label className="text-[0.6875rem] text-[#465a4e]" htmlFor={campoId}>
          Texto do documento
        </label>
        <span className="num text-[0.625rem] text-[#5d6c63]">
          {valor.trim().length} caracteres
        </span>
      </div>

      <TextArea
        className="h-[7.5rem] w-full"
        id={campoId}
        placeholder="Ou cole o texto aqui"
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
      />

      {preenchido && (
        <p className="mt-2 flex items-center gap-1.5 text-[0.625rem] text-[#466451]">
          <IconeOk className="size-[0.8125rem]" />
          Texto carregado
        </p>
      )}
    </section>
  );
}
