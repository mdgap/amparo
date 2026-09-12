# MindTheGap

Triagem assistida por IA para pedidos de medicamento ao SUS.

O advogado informa medicamento, preço CMED e posologia. A ferramenta calcula o
custo anual, define **foro e polo passivo pelo Tema 1234/STF**, confere os
**seis requisitos do Tema 6/STF** contra o laudo e a receita, cruza com a nota
do e-NatJus e devolve um dossiê: memorando de rota, requerimento
administrativo, resumo de evidência, pendências do cliente e trecho de petição.

**A regra que organiza o projeto: número nunca sai do modelo.** Custo, conversão
em salários mínimos, foro e polo passivo vêm de um motor determinístico e
testado. O LLM só lê documento, classifica requisito e redige — sempre citando
o trecho do corpus oficial que sustenta cada afirmação.

## Estrutura

```
backend/    Node 22 + Fastify + Postgres (pgvector)
  src/domain/    motor determinístico (custo, Tema 1234, Tema 6) — coberto por testes
  src/rag/       busca no corpus: vetorial com fallback lexical
  src/llm/       classificação e redação, com prompt versionado
  corpus/        normas em .md, uma por arquivo, ingeridas para o banco
frontend/   React 19 + Vite + Tailwind v4 + HeroUI v3
docs/       arquitetura e o canvas do projeto
```

## Rodando

Pré-requisitos: Node 22+, Postgres 14+ com a extensão `pgvector`.

```bash
brew install pgvector          # extensão do pgvector para o Postgres do brew
createdb mindthegap
cp .env.example .env           # preencha as chaves (opcionais, veja abaixo)
npm install
npm run db:migrate
npm run db:ingest              # carrega backend/corpus/*.md
npm run dev                    # API em :3333, web em :5173
```

### Sem chave de API

Toda a IA passa pela **OpenRouter**, com uma única chave (`OPENROUTER_API_KEY`)
para redação, classificação e embeddings. Os modelos ficam no `.env`:
`openai/gpt-oss-120b` para texto e `voyageai/voyage-4-lite` para embeddings.

Sem a chave o projeto sobe igual:

- `/api/analise` devolve só o motor de regras (foro, polo passivo, custeio,
  memória de cálculo) e avisa que a IA está desligada;
- a busca no corpus cai para similaridade lexical (`pg_trgm`, por
  `word_similarity`) em vez de pgvector.

Isso mantém a demo de pé mesmo se a rede cair no dia do hackathon.

## Produção

Docker Compose com três serviços — `web` (nginx servindo o SPA e fazendo proxy
de `/api`), `api` e `db` (pgvector). Um domínio só. O passo a passo para o
Dokploy está em [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
cp .env.deploy.example .env    # preencha ao menos POSTGRES_PASSWORD
docker compose up -d --build
```

## Testes

```bash
npm test
```

Cobrem o que não pode errar: arredondamento de apresentações, caso exatamente
no teto de 210 SM, medicamento sem registro na ANVISA, e o fato de um requisito
ausente na resposta do modelo virar pendência — nunca aprovação.

## Privacidade

Nome e CPF não entram. A API recusa (422) documentos com CPF, e o texto dos
documentos do caso **não é persistido** — o banco guarda só a entrada numérica,
o resultado e o dossiê. Demo apenas com dados sintéticos.

## Aviso

Ferramenta de apoio à triagem. As saídas são minutas revisáveis, não parecer
jurídico, e não substituem a conferência do advogado responsável.

Licença MIT.
