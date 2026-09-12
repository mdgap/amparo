export function Cabecalho({
  titulo,
  descricao,
  passo,
}: {
  titulo: string;
  descricao: string;
  passo: string;
}) {
  return (
    <header className="mb-8">
      <p className="text-sm font-medium text-muted">{passo}</p>
      <h1 className="fonte-display mt-1 text-[2rem] font-semibold leading-tight">
        {titulo}
      </h1>
      <p className="mt-2 max-w-2xl text-base text-muted">{descricao}</p>
    </header>
  );
}
