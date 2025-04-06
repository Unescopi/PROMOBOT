FROM node:18-alpine AS base

# Definir argumentos de build
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
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Definir variáveis de ambiente para o build
ENV MONGODB_URI=${MONGODB_URI}
ENV MONGODB_DB=${MONGODB_DB}
ENV EVOLUTION_API_URL=${EVOLUTION_API_URL}
ENV EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV GIT_SHA=${GIT_SHA}

RUN npm run build

# Imagem de produção
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Passar variáveis de ambiente para a imagem de produção
ENV MONGODB_URI=${MONGODB_URI}
ENV MONGODB_DB=${MONGODB_DB}
ENV EVOLUTION_API_URL=${EVOLUTION_API_URL}
ENV EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV GIT_SHA=${GIT_SHA}

# Criar usuário não-root para produção
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar código compilado
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"] 