FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --omit=dev

# Copiar código fonte
COPY src/ ./src/

# Expor porta
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["node", "src/server.js"] 