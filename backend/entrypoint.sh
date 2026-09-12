#!/bin/sh
# Migração é pré-condição: se falhar, o container falha — não sobe API sem schema.
set -e
echo "→ migrando o banco"
node dist/scripts/migrate.js

# Ingestão depende de rede (embeddings) e é idempotente por slug. Uma falha aqui
# degrada a busca, não derruba o serviço: o app precisa subir mesmo sem IA.
echo "→ ingerindo o corpus"
node dist/scripts/ingest.js || echo "aviso: ingestão falhou; a API sobe assim mesmo"

exec "$@"
