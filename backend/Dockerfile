# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
# If package-lock.json exists it is used; otherwise we fall back to npm install
COPY package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY db ./db
COPY workers ./workers

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "src/server.js"]
