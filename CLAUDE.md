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
- Frontend: HeroUI **v3** (compound components, `onPress`, sem Provider,
  Tailwind v4). Não aplicar padrões da v2.

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
