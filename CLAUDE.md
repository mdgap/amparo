# MindTheGap — instruções para agentes

Projeto de hackathon (OAB 2026). Monorepo com npm workspaces: `backend`, `frontend`.

## Invariantes do produto — não quebrar

1. **Número nunca sai do modelo.** Custo anual, conversão em salários mínimos,
   foro e polo passivo são calculados em `backend/src/domain/`. O LLM recebe os
   números prontos e é instruído a repeti-los. Se precisar de uma nova conta,
   ela vai para o domínio, com teste, e não para o prompt.
2. **Toda afirmação jurídica cita fonte do corpus** (`[F1]`, `[F2]`). Sem trecho
   que sustente, a saída diz "sem fonte no corpus".
3. **Ausência de prova é pendência, não aprovação.** Requisito não avaliado pelo
   modelo entra como `nao_avaliado` e bloqueia `aptoParaProtocolo`.
4. **Sem dado pessoal.** Nome e CPF não entram; o texto dos documentos do caso
   não é persistido.
5. **Roda sem chave de API.** Toda etapa de IA degrada com aviso, nunca com erro.

## Convenções

- Código e comentários em português; identificadores do domínio em português
  (`definirRota`, `resumirTema6`) para bater com o vocabulário jurídico.
- TypeScript estrito, ESM, imports com extensão `.ts` (type stripping do Node 22).
- Parâmetros que mudam por ato normativo (salário mínimo, teto de 210 SM) ficam
  em `backend/src/domain/parametros.ts`, versionados — nunca inline na regra.
- Prompt versionado em `backend/src/llm/prompts/sistema.ts`; a versão vai no
  registro da análise.
- Toda IA passa pela **OpenRouter**, com UMA chave (`OPENROUTER_API_KEY`) para
  redação, classificação e embeddings. Modelos ficam no `.env`, não no código.
  Nada de SDK de provedor: `fetch` na API compatível com a da OpenAI.
- `EMBEDDINGS_DIM` precisa bater com o `VECTOR(n)` da migração 001. Trocar de
  modelo de embedding exige conferir a dimensão e reingerir o corpus.
- Frontend: HeroUI **v3** (compound components, `onPress`, sem Provider,
  Tailwind v4). Não aplicar padrões da v2.

## Design system

A paleta institucional sobrescreve os tokens semânticos do HeroUI em
`frontend/src/index.css` — mexa lá, não em cor solta no componente.

- Ação primária é verde-escuro `#062B16` com texto branco. O verde da marca
  `#00CB7C` nunca carrega texto: marca elemento ativo, ícone e gradiente.
- O gradiente é elemento de marca. Documento, tabela e texto longo ficam em
  superfície branca sólida.
- Manrope nos títulos (`.fonte-display`), Inter no corpo. Valores monetários e
  colunas numéricas usam `.num` (algarismos tabulares).
- Raio: 16px em cartões (`rounded-2xl`), 12px em botões e campos (token
  `--radius`), 20px em modais, pílula em selos de estado.
- Controles interativos usam a classe `.controle` (altura mínima de 44px).
- Estado de análise sempre com ícone + texto + cor (`components/Estado.tsx`),
  nunca cor sozinha. Âmbar para atenção, vermelho para ausência ou erro.
  **Verde significa "evidência localizada no documento", nunca aprovação
  jurídica** — a redação dos rótulos precisa preservar isso.
- Fluxo em quatro etapas: Documentos → Conferência → Achados → Dossiê. Uma
  única ação primária dominante por etapa.

## Comandos

```bash
npm test            # motor determinístico
npm run dev         # API :3333 + web :5173
npm run db:migrate
npm run db:ingest
```

## Pendência jurídica aberta

Os enunciados dos seis requisitos em `backend/src/domain/tema6.ts` e os
fundamentos em `rota.ts` são leitura de trabalho e **precisam de conferência da
equipe jurídica contra o texto oficial** antes da demo. O mesmo vale para o
valor do salário mínimo em `parametros.ts`.
