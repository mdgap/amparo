CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Documentos do corpus normativo oficial (Temas do STF, súmulas, leis, PCDT...).
CREATE TABLE IF NOT EXISTS documento (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  titulo        TEXT NOT NULL,
  tipo          TEXT NOT NULL,          -- tema_stf | sumula | lei | resolucao | pcdt | nota_enatjus
  orgao         TEXT,                   -- STF | STJ | CNJ | ANVISA | CONITEC ...
  url_oficial   TEXT,
  publicado_em  DATE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trechos citáveis. Toda afirmação do dossiê aponta para um trecho daqui.
CREATE TABLE IF NOT EXISTS trecho (
  id            BIGSERIAL PRIMARY KEY,
  documento_id  BIGINT NOT NULL REFERENCES documento(id) ON DELETE CASCADE,
  ordem         INT NOT NULL,
  ancora        TEXT,                   -- "art. 19-Q", "item 3 da tese"
  conteudo      TEXT NOT NULL,
  embedding     VECTOR(1024),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (documento_id, ordem)
);

CREATE INDEX IF NOT EXISTS trecho_embedding_idx
  ON trecho USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS trecho_conteudo_trgm_idx
  ON trecho USING gin (conteudo gin_trgm_ops);

-- Preços CMED (PMVG). Fonte dos números do motor de custo.
CREATE TABLE IF NOT EXISTS cmed_preco (
  id                       BIGSERIAL PRIMARY KEY,
  principio_ativo          TEXT NOT NULL,
  produto                  TEXT NOT NULL,
  apresentacao             TEXT NOT NULL,
  laboratorio              TEXT,
  ean                      TEXT,
  pmvg_sem_impostos        NUMERIC(14,4),
  pmvg_0                   NUMERIC(14,4),
  unidades_por_apresentacao INT,
  tabela_versao            TEXT NOT NULL,   -- ex.: "2026-03"
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cmed_produto_trgm_idx
  ON cmed_preco USING gin (produto gin_trgm_ops);
CREATE INDEX IF NOT EXISTS cmed_principio_trgm_idx
  ON cmed_preco USING gin (principio_ativo gin_trgm_ops);

-- Análises geradas. SEM dado pessoal: nome e CPF nunca entram.
CREATE TABLE IF NOT EXISTS analise (
  id                BIGSERIAL PRIMARY KEY,
  parametros_versao TEXT NOT NULL,
  entrada           JSONB NOT NULL,
  rota              JSONB NOT NULL,
  tema6             JSONB NOT NULL,
  dossie            JSONB,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);
