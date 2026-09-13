-- Tecnologias demandadas à CONITEC, do painel público.
-- É a fonte do requisito (b) do Tema 6: situação na CONITEC e data do
-- protocolo, que é o que permite apurar a mora do art. 19-R.
CREATE TABLE IF NOT EXISTS conitec_demanda (
  id              BIGSERIAL PRIMARY KEY,
  tecnologia      TEXT NOT NULL,
  tipo            TEXT,
  indicacao       TEXT,
  demandante      TEXT,
  tema            TEXT,
  status          TEXT NOT NULL,
  data_protocolo  DATE,
  data_decisao    DATE,
  tabela_versao   TEXT NOT NULL,   -- data de publicação do painel, ex.: "2026-06-15"
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conitec_tecnologia_trgm_idx
  ON conitec_demanda USING gin (tecnologia gin_trgm_ops);
