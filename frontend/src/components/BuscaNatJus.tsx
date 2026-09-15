import { useState } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { api } from "../lib/api.ts";
import { DEMO } from "../demo/ativo.ts";
import { baixarExemplo } from "../demo/download.ts";

type Nota = { id: number; cid: string; uf: string; finalizadaEm: string; url: string };

/**
 * Busca na consulta pública de notas técnicas do e-NatJus.
 *
 * O Tema 1234 exige a consulta ao NAT-Jus para medicamento não incorporado, e
 * diz que a decisão não pode se apoiar apenas no laudo do autor. Era a única
 * peça do fluxo que dependia de o advogado sair do produto para buscar.
 *
 * A escolha da nota é dele: o CID da nota é que a aproxima ou afasta do caso, e
 * isso é juízo clínico-jurídico, não automação.
 */
export function BuscaNatJus({ onImportar }: { onImportar: (texto: string) => void }) {
  const [termo, setTermo] = useState("");
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [total, setTotal] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState<number | null>(null);
  const [importada, setImportada] = useState<string | null>(null);

  /**
   * Traz o conteúdo da nota para o campo. A nota é pública, mas traz o nome do
   * paciente daquele processo — o servidor anonimiza antes de devolver, e o
   * placar do que saiu aparece aqui.
   */
  async function importar(id: number) {
    setImportando(id);
    setErro(null);
    try {
      const r = await api.notaNatjus(id);
      onImportar(r.texto);
      const total = Object.values(r.removidos).reduce((a, b) => a + b, 0);
      setImportada(
        `Nota ${id} importada${total ? `: ${total} dado(s) pessoal(is) do processo de origem foram substituídos por marcador.` : "."}`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao importar a nota.");
    } finally {
      setImportando(null);
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
      const r = await api.natjus(termo.trim());
      setNotas(r.notas);
      setTotal(r.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na consulta.");
      setNotas(null);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
      {DEMO && <p className="mb-3 text-xs text-muted">Busca simulada. Os resultados são documentos fictícios da demonstração, sem emissão pelo CNJ ou pelo NAT-Jus. Ex.: acolhix.</p>}
      <div className="flex flex-wrap items-end gap-3">
        <TextField className="min-w-52 flex-1" value={termo} onChange={setTermo}
          onKeyDown={(e) => { if (e.key === "Enter") void buscar(); }}>
          <Label>Procurar nota no e-NatJus pelo princípio ativo</Label>
          <Input className="controle" placeholder="Ex.: canabidiol" />
        </TextField>
        <Button className="controle" isPending={buscando} variant="secondary"
          onPress={() => void buscar()}>
          {buscando ? <Spinner size="sm" /> : null}
          Buscar
        </Button>
      </div>

      {erro && <p className="mt-3 text-sm text-[var(--status-erro-fg)]">{erro}</p>}
      {importada && <p className="mt-3 text-sm text-[var(--status-ok-fg)]">{importada}</p>}

      {notas?.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          Nenhuma nota técnica encontrada para esse princípio ativo.
        </p>
      )}

      {notas && notas.length > 0 && (
        <>
          <p className="mt-4 text-sm text-muted">
            {total} nota(s) no e-NatJus. Abra a que tiver o CID mais próximo do
            caso e cole o conteúdo abaixo. A escolha é sua.
          </p>
          <ul className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
            {notas.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2">
                {DEMO ? <button type="button" className="controle min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-surface px-4 py-2 text-left text-sm" onClick={async () => {
                  setImportando(n.id);
                  try { const r = await api.notaNatjus(n.id); await baixarExemplo(r.texto, `evidencia-${n.id}`); }
                  catch { setErro("Não foi possível baixar o exemplo."); } finally { setImportando(null); }
                }}>Baixar documento fictício: {n.cid}</button> : <a
                  className="controle flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--border)] bg-surface px-4 py-2 text-sm hover:bg-[var(--surface-tertiary)]"
                  href={n.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="num font-medium">nº {n.id}</span>
                  <span className="min-w-0 flex-1 truncate">{n.cid}</span>
                  <span className="text-muted">NatJus {n.uf}</span>
                  <span className="num text-muted">{n.finalizadaEm}</span>
                </a>}
                <Button
                  className="controle shrink-0"
                  isPending={importando === n.id}
                  size="sm"
                  variant="secondary"
                  onPress={() => void importar(n.id)}
                >
                  {importando === n.id ? <Spinner size="sm" /> : null}
                  Usar esta
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
