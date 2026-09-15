import { AVISO_FICTICIO } from "./cenarios.ts";

export async function baixarExemplo(texto: string, nome: string) {
  await new Promise<void>((resolve) => setTimeout(resolve, 650));
  const url = URL.createObjectURL(new Blob([`${AVISO_FICTICIO}\n\n${texto}`], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `amparo-demo-${nome}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
