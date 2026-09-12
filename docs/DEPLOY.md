# Deploy no Dokploy

## Desenho

Uma origem só. O `web` (nginx) serve o SPA e faz proxy de `/api` para o `api`.
O frontend chama caminhos relativos (`/api/analise`), então isso dispensa CORS,
dispensa variável de URL de API no build e gasta **um domínio, não dois**.

```
        Traefik (Dokploy)
              │  seu-dominio.com
              ▼
        web  (nginx :80)
        ├── /            → SPA estático
        └── /api/*       → api :3333
                              │
                              ▼
                         db (pgvector :5432)
```

## Passo a passo

1. **Criar** um projeto no Dokploy e adicionar um serviço do tipo
   **Docker Compose** apontando para este repositório.
   O arquivo é `docker-compose.yml`, na raiz.

2. **Environment** — cole o conteúdo de `.env.deploy.example` e preencha:

   | Variável | Obrigatória | Observação |
   |---|---|---|
   | `POSTGRES_PASSWORD` | **sim** | o deploy falha sem ela, de propósito |
   | `OPENROUTER_API_KEY` | não | sem ela sobe só o motor de regras |
   | `POSTGRES_USER`, `POSTGRES_DB` | não | padrão `mindthegap` |
   | `OPENROUTER_MODEL` | não | padrão `openai/gpt-oss-120b` |
   | `EMBEDDINGS_MODEL` | não | padrão `voyageai/voyage-4-lite` |
   | `EMBEDDINGS_DIM` | não | `1024` — tem que bater com o `VECTOR(n)` da migração 001 |

   O Dokploy grava essas variáveis num `.env` ao lado do compose, mas **não as
   injeta sozinho** nos containers. Por isso cada uma aparece explicitamente em
   `environment:` no `docker-compose.yml`.

3. **Domains** — adicione o domínio no serviço **`web`**, porta **80**.
   O `api` não precisa de domínio: ele só é alcançado pelo nginx, pela rede
   interna. O Dokploy injeta as labels do Traefik e a rede sozinho.

4. **Deploy.** Na primeira subida o container do `api` executa, nesta ordem:
   migração do banco, ingestão do corpus e só então o servidor.

## O que acontece a cada deploy

`backend/entrypoint.sh`:

- **migração** é pré-condição — se falhar, o container falha. Não sobe API sem
  schema. É idempotente (`CREATE TABLE IF NOT EXISTS`).
- **ingestão** do corpus depende de rede (embeddings) e é idempotente por
  `slug`. Se falhar, registra aviso e a API sobe assim mesmo — o produto tem que
  subir mesmo com a IA fora.

## Lista de preços da CMED

Carrega sozinha, no start do contêiner da API — mas **em segundo plano**, e só
quando precisa.

- Não atrasa a subida: a API fica saudável em segundos, e a carga dos 14 MB e
  ~26 mil linhas segue por trás. Enquanto não termina, a busca de preço devolve
  vazio e o advogado digita à mão.
- Não recarrega à toa: se a lista já está no banco e tem menos de 7 dias, o
  script sai na hora. A CMED publica mensalmente.
- Não duplica: uma trava do Postgres impede duas cargas simultâneas — o start
  automático coincidindo com uma execução manual, ou dois contêineres subindo
  juntos num redeploy. E a substituição é por DELETE dentro da transação, não
  TRUNCATE: quem consulta continua vendo a lista antiga até o commit, sem janela
  de tabela vazia nem lock de leitura.

Para forçar uma recarga fora do prazo, ou depois de uma falha:

```bash
docker exec <container-da-api> node dist/scripts/cmed.js
```

Sem argumento ele descobre o link do PMVG no portal da ANVISA e baixa. Com um
caminho ou URL, usa o arquivo indicado.

## Leitura de PDF e OCR

A etapa 1 aceita PDF. O contêiner da API traz `poppler-utils` e `tesseract-ocr`
com o pacote de português, e o caminho se divide sozinho:

- **PDF digital** — o texto já está no arquivo. Extração instantânea.
- **PDF digitalizado** — não tem camada de texto. Rasteriza a 300 dpi e passa
  pelo OCR, no próprio contêiner: o documento não sai da infraestrutura.

Medido na imagem: página digital sai em menos de 1s; página digitalizada leva
cerca de 7s, com confiança perto de 90%. Abaixo de 70% a interface pede
conferência, porque nome mal lido não é encontrado depois pela anonimização.

O arquivo é lido em memória, processado e descartado. Teto de 20 MB e 30
páginas por documento.

## Anonimização

O serviço `anonimizador` roda na própria infraestrutura — Presidio com o modelo
`pt` do spaCy, mais reconhecedores brasileiros que o Presidio não traz de
fábrica (CPF, cartão do SUS, CNPJ, CEP, CRM). **O documento identificado não sai
daqui.**

Duas camadas: padrão para o que tem formato fixo, modelo para nome de pessoa em
texto corrido. O texto sai com marcador — `[NOME]`, `[CPF]`, `[CRM]` — e não
apagado: o requisito (e) do Tema 6 exige laudo com CRM e histórico com datas, e
apagar destruiria a prova que o produto avalia. **Data não é anonimizada**, pelo
mesmo motivo.

Vocabulário clínico é preservado: o backend manda os princípios ativos da CMED
junto, senão o modelo apaga "lamotrigina" como se fosse nome de gente. Termo
precedido de "síndrome de", "doença de" e afins também escapa.

**Falha fechada.** Se o `anonimizador` não responder, a rota devolve 503 e o
documento não é processado. Devolver texto identificado em silêncio seria pior
que não funcionar.

Custo: a imagem carrega o modelo `pt_core_news_lg`. Conte ~2 GB de memória e
cerca de 90s de warm-up no primeiro start.

## Detalhes que não são óbvios

**Timeout do nginx.** A análise completa leva cerca de dois minutos (duas
chamadas ao modelo em série). O padrão do nginx é 60s e cortaria a resposta no
meio. `nginx.conf` usa `proxy_read_timeout 300s`.

**Contexto de build.** Os dois Dockerfiles usam a **raiz do monorepo** como
contexto, porque o `package-lock.json` e os workspaces npm vivem lá. Por isso
`dockerfile: backend/Dockerfile` com `context: .`.

**Persistência.** O Postgres usa o volume nomeado `postgres_data`, que o
Dokploy consegue incluir no Volume Backups. Se preferir bind mount, use
`../files/...` — caminho absoluto no host é apagado a cada deploy.

**Sem chave de API.** A stack sobe e funciona: `/api/analise` devolve só o motor
de regras com um aviso, e a busca no corpus cai para lexical.

## Verificar depois de subir

```bash
docker compose logs api | head -20     # deve mostrar migração e "48 trechos"
docker compose ps                      # os três serviços healthy
```

No navegador, `seu-dominio.com` abre a etapa 1 e
`seu-dominio.com/api/requisitos` devolve os seis requisitos do Tema 6.
