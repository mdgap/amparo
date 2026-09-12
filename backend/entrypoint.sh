#!/bin/sh
# Migração é pré-condição: se falhar, o container falha — não sobe API sem schema.
set -e
echo "→ migrando o banco"
node dist/scripts/migrate.js

# Ingestão depende de rede (embeddings) e é idempotente por slug. Uma falha aqui
# degrada a busca, não derruba o serviço: o app precisa subir mesmo sem IA.
echo "→ ingerindo o corpus"
node dist/scripts/ingest.js || echo "aviso: ingestão falhou; a API sobe assim mesmo"

# Lista de preços da CMED: 14 MB e ~26 mil linhas, alguns minutos. Roda em
# SEGUNDO PLANO para não atrasar o start — o healthcheck do Dokploy não pode
# esperar por isso — e só recarrega se a lista estiver vazia ou velha.
# Enquanto não termina, a busca de preço devolve vazio e o advogado digita à mão.
echo "→ conferindo a lista de preços da CMED (em segundo plano)"
(
  node dist/scripts/cmed.js --se-necessario \
    || echo "aviso: carga da CMED falhou; rode 'node dist/scripts/cmed.js' manualmente"
) &

exec "$@"
