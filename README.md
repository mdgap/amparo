# Amparo

Triagem assistida por IA para ações de medicamento contra o SUS.

O advogado envia os documentos do caso — laudo, receita, pedido administrativo
e nota técnica do e-NatJus, em PDF ou texto. O Amparo anonimiza o texto,
localiza o medicamento na tabela da CMED, calcula o custo anual, define **foro e
polo passivo pelo Tema 1234/STF**, confere os **seis requisitos do Tema 6/STF**
com fonte oficial e devolve um dossiê: memorando de rota, requerimento
administrativo, resumo de evidência, pendências do cliente e trecho de petição.

**A regra que organiza o projeto: número nunca sai do modelo.** Custo, conversão
em salários mínimos, foro e polo passivo vêm de um motor determinístico e
testado. O LLM só lê documento, classifica requisito e redige — sempre citando
o trecho do corpus oficial que sustenta cada afirmação.

> Amparo é o nome do produto. Pacotes, banco, contêineres e o repositório
> seguem com o identificador interno `mindthegap`.

## Como funciona

Tudo começa no **Painel de casos**, em "Novo caso". A análise segue quatro
etapas:

1. **Documentos** — upload de PDF (o digitalizado passa por OCR no servidor) ou
   texto colado; busca da nota técnica no e-NatJus; "Carregar caso sintético"
   para conhecer o fluxo sem documento real.
2. **Conferência** — apresentação e preço na tabela CMED (PMVG 0%, o que o Tema
   1234 manda considerar), posologia, situação do medicamento na CONITEC e
   hipossuficiência.
3. **Achados** — a rota calculada pelo motor (Justiça Federal ou Estadual, custo
   anual, salários mínimos, polo passivo e custeio) e os seis requisitos do
   Tema 6, cada um com o trecho do documento, a fonte do corpus e a próxima
   providência.
4. **Dossiê** — as minutas e as pendências do cliente. Enquanto houver requisito
   sem comprovação, o caso não fica apto para protocolo.

Ao clicar em "Analisar caso", a API transmite o progresso por Server-Sent
Events: anonimização → motor de regras → Tema 6 → placar → dossiê.

As análises concluídas voltam ao painel, com métricas e histórico, e podem ser
reabertas — sem os documentos, que não são guardados. A tela **Sobre nós**
explica o fluxo, a proteção de dados e onde entra IA, lendo o catálogo do
próprio backend para não descrever uma versão que já não existe.

## Estrutura

```
backend/          Node 22 + Fastify + Postgres (pgvector, pg_trgm, unaccent)
  src/domain/       motor determinístico (custo, Tema 1234, Tema 6, parâmetros) — coberto por testes
  src/llm/          classificação e redação via OpenRouter, com prompt versionado
  src/rag/          busca no corpus: vetorial com fallback lexical
  src/documentos/   leitura de PDF, OCR e cliente do anonimizador
  src/natjus/       consulta pública do e-NatJus
  src/routes/       API HTTP (/api/*)
  src/scripts/      migração, ingestão, cargas da CMED e da CONITEC, casos de demonstração
  db/migrations/    SQL reaplicado em ordem a cada `db:migrate` (idempotente)
  corpus/           normas em .md, uma por arquivo, ingeridas para o banco
  test/             node:test
anonimizador/     Python 3.12 + FastAPI + Presidio + spaCy (pt_core_news_lg)
frontend/         React 19 + Vite + Tailwind v4 + HeroUI v3
docs/             arquitetura, deploy e o canvas do projeto
```

## Fontes de dados

| Fonte | O que traz | Como entra |
| --- | --- | --- |
| Corpus jurídico | Guia rápido do CNJ (Temas 6 e 1234), Temas 6, 1234 e 500/STF, Súmulas Vinculantes 60 e 61, Tema 106/STJ, Lei 8.080/1990 (arts. 19-M a 19-T) | `npm run db:ingest` |
| CMED | Preço PMVG por apresentação, baixado da Anvisa | `npm run db:cmed` |
| CONITEC | Painel de tecnologias demandadas | `npm run db:conitec` |
| e-NatJus | Notas técnicas, pela consulta pública do CNJ | na hora, sem carga |

O que ainda falta no corpus está em
[`backend/corpus/README.md`](backend/corpus/README.md). O e-NatJus não tem API
documentada: se a consulta falhar, só a busca de notas fica indisponível.

## Rodando localmente

Pré-requisitos:

- Node 22.18+ (o backend roda `.ts` direto, por type stripping);
- Postgres 14+ com a extensão `pgvector`;
- Docker, para o anonimizador;
- `poppler` e `tesseract` com o idioma português — só para PDF digitalizado.

```bash
# macOS
brew install pgvector poppler tesseract tesseract-lang
# Debian/Ubuntu (ajuste o número à versão do seu Postgres)
sudo apt install postgresql-16-pgvector poppler-utils tesseract-ocr tesseract-ocr-por
```

```bash
createdb mindthegap
cp .env.example .env           # a chave da OpenRouter é opcional, veja abaixo

# Anonimizador: ~2 GB de RAM e cerca de 90 s até responder
docker build -f anonimizador/Dockerfile -t mindthegap-anonimizador .
docker run -d --name anonimizador-local -p 8010:8000 mindthegap-anonimizador

npm install
npm run db:migrate
npm run db:ingest              # carrega backend/corpus/*.md
npm run db:cmed                # baixa e carrega a lista de preços da CMED
npm run db:conitec             # baixa e carrega o painel da CONITEC
npm run db:demo                # opcional: quatro casos de demonstração no painel
npm run dev                    # API em :3333, web em :5173
```

### Sem chave de API

Toda a IA passa pela **OpenRouter**, com uma única chave (`OPENROUTER_API_KEY`)
para redação, classificação e embeddings. Os modelos ficam no `.env`:
`openai/gpt-oss-120b` para texto e `voyageai/voyage-4-lite` para embeddings.

Sem a chave o projeto sobe igual:

- `/api/analise` devolve só o motor de regras (foro, polo passivo, custeio,
  memória de cálculo) e avisa que a IA está desligada — sem leitura dos
  requisitos do Tema 6 nem redação do dossiê;
- a busca no corpus cai para similaridade lexical (`pg_trgm`, por
  `word_similarity`) em vez de pgvector. `EMBEDDINGS_MODEL=none` força esse
  modo mesmo com chave.

Busca na CMED, reconhecimento do medicamento nos documentos e consulta à
CONITEC são determinísticos e funcionam sem chave. Isso mantém a demo de pé
mesmo se a rede cair no dia do hackathon.

### Sem anonimizador

Falha fechada: o upload de PDF e a análise com IA recusam o documento em vez de
seguir com texto identificado. O motor de regras continua disponível.

## Produção

Docker Compose com quatro serviços — `web` (nginx servindo o SPA e fazendo proxy
de `/api`), `api`, `anonimizador` e `db` (pgvector). Um domínio só, apontado
para `web`. Ao subir, a `api` aplica as migrações, ingere o corpus e, em
segundo plano, recarrega CMED e CONITEC quando estão desatualizadas. O passo a
passo para o Dokploy está em [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
cp .env.deploy.example .env    # preencha ao menos POSTGRES_PASSWORD
docker compose up -d --build
```

## Testes

```bash
npm test
npm run typecheck
```

Cobrem o que não pode errar: arredondamento de apresentações, caso exatamente
no teto de 210 SM, medicamento sem registro na ANVISA, e o fato de um requisito
ausente na resposta do modelo virar pendência — nunca aprovação. A API é
testada com dependências falsas, sem banco nem rede, junto com histórico e
métricas do painel.

## Privacidade

- **Anonimização antes de tudo.** Nome, CPF, cartão do SUS, CNPJ, CEP, CRM,
  telefone, e-mail e local viram marcador (`[NOME]`, `[CPF]`, `[CARTAO SUS]`)
  no serviço `anonimizador`, na própria infraestrutura. Datas e nomes de
  medicamento da CMED são preservados: são prova.
- **Falha fechada.** Se o anonimizador não responder, o documento é recusado.
  CPF em formato padrão que chegue cru à análise também é recusado (422).
- **O que fica guardado:** dados do caso (medicamento, preço e posologia), a
  rota calculada, a situação de cada requisito e as minutas. **Não ficam:** os
  documentos, os trechos citados, as justificativas do modelo e os prompts. Os
  erros não registram texto de documento.
- **Arquivos:** PDFs são lidos em memória; o arquivo temporário do OCR é apagado
  ao fim da leitura.
- **Modelo de linguagem:** recebe o texto já anonimizado, pela OpenRouter com
  Zero Data Retention.

Demo apenas com dados sintéticos.

## Documentação

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — fluxo da análise, persistência e degradação
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — produção no Dokploy
- [`backend/corpus/README.md`](backend/corpus/README.md) — formato e cobertura do corpus
- [`CLAUDE.md`](CLAUDE.md) — invariantes do produto, convenções e design system

## Aviso

Ferramenta de apoio à triagem. As saídas são minutas revisáveis, não parecer
jurídico, e não substituem a conferência do advogado responsável.

Licença MIT.
