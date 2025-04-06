FROM node:18-alpine AS base

# Definir argumentos para build
ARG MONGODB_URI
ARG MONGODB_DB
ARG EVOLUTION_API_URL
ARG EVOLUTION_API_KEY
ARG NEXT_PUBLIC_APP_URL
ARG GIT_SHA

# Instalar dependências apenas para compilação
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Construir a aplicação
FROM base AS builder
WORKDIR /app

# Passar os argumentos para esta etapa
ARG MONGODB_URI
ARG MONGODB_DB
ARG EVOLUTION_API_URL
ARG EVOLUTION_API_KEY
ARG NEXT_PUBLIC_APP_URL
ARG GIT_SHA

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Criar arquivo .env.local para o build
RUN touch .env.local && \
    echo "MONGODB_URI=${MONGODB_URI}" >> .env.local && \
    echo "MONGODB_DB=${MONGODB_DB}" >> .env.local && \
    echo "EVOLUTION_API_URL=${EVOLUTION_API_URL}" >> .env.local && \
    echo "EVOLUTION_API_KEY=${EVOLUTION_API_KEY}" >> .env.local && \
    echo "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}" >> .env.local

RUN npm run build

# Imagem de produção
FROM base AS runner
WORKDIR /app

# Passar os argumentos para esta etapa
ARG MONGODB_URI
ARG MONGODB_DB
ARG EVOLUTION_API_URL
ARG EVOLUTION_API_KEY
ARG NEXT_PUBLIC_APP_URL
ARG GIT_SHA

ENV NODE_ENV=production
ENV PORT=3000

# Definir as variáveis de ambiente na imagem final
ENV MONGODB_URI=${MONGODB_URI}
ENV MONGODB_DB=${MONGODB_DB}
ENV EVOLUTION_API_URL=${EVOLUTION_API_URL}
ENV EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Criar usuário não-root para produção
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar código compilado
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"] 