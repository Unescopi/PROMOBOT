# PromoBot - Backend

Este é o serviço backend do sistema PromoBot, responsável pela API, processamento de mensagens e integrações com WhatsApp.

## Deploy no EasyPanel

1. **Criar um novo serviço no EasyPanel**
   - Escolha a opção "GitHub" ou "Upload".
   - Se usar GitHub, selecione o diretório `/backend` como diretório de contexto.

2. **Configurar variáveis de ambiente**
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb://mongo:27017/promobot
   JWT_SECRET=sua_chave_secreta_aqui
   REDIS_URL=redis://redis:6379
   REDIS_ENABLED=true
   EVOLUTION_API_URL=http://seu-servidor-evolution-api:8080
   EVOLUTION_API_KEY=sua_api_key
   WHATSAPP_INSTANCE=PromoBot
   ```

3. **Configurar redirecionamento**
   - No menu "Domínios", configure um redirecionamento:
   - Caminho: `/api`
   - Destino: `http://nome-do-servico-backend:3001`
   - Reescrita de URL: `^/api/(.*) /$1`
   - Ative o suporte a WebSocket.

## Componentes

Este serviço inclui:
- API REST para gerenciamento de mensagens e contatos
- Integração com MongoDB para persistência de dados
- Integração com Redis para processamento de filas
- Integração com Evolution API para envio de mensagens WhatsApp

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Executar em modo produção
npm start
``` 