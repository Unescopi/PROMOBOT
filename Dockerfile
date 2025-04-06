FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de package e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar restante dos arquivos
COPY . .

# Criar arquivo .env.local
RUN printf "MONGODB_URI=$MONGODB_URI\n\
MONGODB_DB=$MONGODB_DB\n\
EVOLUTION_API_URL=$EVOLUTION_API_URL\n\
EVOLUTION_API_KEY=$EVOLUTION_API_KEY\n\
EVOLUTION_INSTANCE=$EVOLUTION_INSTANCE\n\
WEBHOOK_SECRET=$WEBHOOK_SECRET\n\
NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL\n\
NODE_ENV=production\n\
PORT=3001\n" > .env.local

# Construir o aplicativo ignorando erros de linting
ENV NEXT_LINT=false
RUN npm run build

# Configurar para execução
EXPOSE 3001
ENV PORT=3001

CMD ["npm", "start"] 