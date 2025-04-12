FROM node:18-alpine as build

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Construir a aplicação
RUN npm run build

# Imagem de produção
FROM nginx:alpine

# Instalar pacote envsubst para substituição de variáveis
RUN apk add --no-cache bash gettext

# Copiar os arquivos de build para o diretório do Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copiar configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copiar script de inicialização
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Expor porta
EXPOSE 80

# Configurar entrypoint personalizado
ENTRYPOINT ["/docker-entrypoint.sh"]

# Comando padrão
CMD ["nginx", "-g", "daemon off;"] 