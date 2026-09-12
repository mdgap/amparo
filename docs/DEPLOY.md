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
