# Contexto de build: a RAIZ do monorepo (workspaces npm).
#   docker build -f backend/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
# Manifests primeiro: a camada de dependências só invalida quando eles mudam.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY backend backend
RUN npm run build --workspace=backend


FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# Só as dependências de produção do backend. O frontend não roda aqui.
RUN npm ci --omit=dev --workspace=@mindthegap/backend \
 && npm cache clean --force

# OCR de PDF digitalizado, dentro do contêiner: o documento do caso não sai da
# infraestrutura. poppler rasteriza as páginas, tesseract lê, em português.
RUN apk add --no-cache poppler-utils tesseract-ocr tesseract-ocr-data-por

COPY --from=build /app/backend/dist backend/dist
# Lidos em runtime pelos scripts: migrate.js -> ../../db, ingest.js -> ../../corpus
COPY backend/db backend/db
COPY backend/corpus backend/corpus
COPY backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /app/backend
USER node
EXPOSE 3333

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3333/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/server.js"]
