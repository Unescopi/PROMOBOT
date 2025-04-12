# PromoBot

Um sistema completo para automatização de envio de mensagens via WhatsApp.

## 🚀 Funcionalidades

- Envio de mensagens em massa para contatos
- Segmentação de contatos por tags e critérios
- Campanhas programadas com recorrência
- Estatísticas de envio e leitura
- Sistema de filas para gerenciamento de envios
- Webhooks para integração com outros sistemas

## 📋 Pré-requisitos

- Node.js (v14+)
- MongoDB
- Redis (opcional, pode operar em modo fallback)
- [Evolution API](https://github.com/evolution-api/evolution-api) configurada

## ⚙️ Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` baseado no `.env.example`:

```
# Configurações do servidor
PORT=3001
NODE_ENV=development

# Configurações do MongoDB
MONGODB_URI=mongodb://localhost:27017/promobot

# Configurações da Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your_api_key_here
WHATSAPP_INSTANCE=instance_name

# Configurações de segurança
JWT_SECRET=your_jwt_secret_here
INTERNAL_API_KEY=your_internal_api_key

# Configurações de rate limiting
WHATSAPP_MESSAGES_PER_MINUTE=20
WHATSAPP_MESSAGES_PER_DAY=1000
ENABLE_WHATSAPP_LIMITS=true

# Configurações do Redis (para filas)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_ENABLED=true

# Configurações da fila
QUEUE_CONCURRENCY=5
```

## 🏃‍♂️ Execução

Para iniciar o servidor em modo de desenvolvimento:

```bash
npm run dev
```

Para iniciar em modo de produção:

```bash
npm start
```

## 🔄 Modo Fallback e Resolução de Problemas

### Redis não disponível

Se o Redis não estiver disponível, o sistema opera em modo de fallback:

1. Defina `REDIS_ENABLED=false` no arquivo `.env` para usar o modo fallback
2. As mensagens serão enviadas diretamente, sem usar o sistema de filas
3. Não haverá limitação de taxa de envio

### MongoDB

- As coleções necessárias serão criadas automaticamente quando o sistema for usado
- Se encontrar problemas, verifique se a URL do MongoDB está correta no arquivo `.env`

### Evolution API

- Verifique se a Evolution API está em execução e acessível
- Certifique-se de que a instância configurada existe
- Se estiver enfrentando problemas, teste a conexão manualmente:
  ```
  curl -X GET [EVOLUTION_API_URL]/instance/connectionState/[WHATSAPP_INSTANCE]
  ```

## 📚 Documentação

A documentação da API está disponível em `/api-docs` quando o servidor estiver em execução.

## 🔐 Endpoints Principais

- `/api` - API principal
- `/api/contacts` - Gerenciamento de contatos
- `/api/messages` - Gerenciamento de mensagens
- `/api/campaigns` - Gerenciamento de campanhas
- `/api/segmentation` - Segmentação de contatos
- `/api/evolution` - Endpoints para gerenciar a conexão WhatsApp
- `/api/queue` - Informações e controle das filas de mensagens

## 📝 Logs e Monitoramento

Durante a inicialização, o sistema mostra logs detalhados sobre:

- Status da conexão MongoDB
- Status da conexão Evolution API
- Status do sistema de filas
- Recursos disponíveis

Estes logs ajudam a diagnosticar problemas e verificar se todos os serviços estão operando corretamente.

## 🔧 Manutenção

### Reiniciar a conexão WhatsApp

Para reiniciar a conexão com o WhatsApp:

```
POST /api/evolution/restart
```

### Limpar filas

Para limpar as filas de mensagens pendentes:

```
POST /api/queue/clear
```

### Pausar/Retomar filas

Para pausar o processamento de filas:

```
POST /api/queue/pause
```

Para retomar:

```
POST /api/queue/resume
```

## Deploy no EasyPanel

Cada serviço pode ser deployado separadamente no EasyPanel:

1. **Backend**:
   - Crie um serviço no EasyPanel usando o diretório `/backend`
   - Configure o redirecionamento para `/api`

2. **Frontend**:
   - Crie outro serviço no EasyPanel usando o diretório `/frontend`
   - Configure o redirecionamento para o caminho raiz `/`

Consulte os arquivos README.md dentro de cada diretório para instruções detalhadas.

## Estrutura do Projeto

- `/src` - Código do backend
- `/frontend` - Código do frontend React
- `/docs` - Documentação adicional

## Recursos

- Envio automatizado de mensagens
- Campanhas programadas
- Segmentação de contatos
- Mensagens personalizadas
- Relatórios e análises
- Sistema de notificações

## Suporte

Para suporte, entre em contato através do email: support@example.com

## Executando o Projeto

### Requisitos
- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)

### Método 1: Usando Docker Compose

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/promobot.git
cd promobot
```

2. Execute o script de configuração:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

3. Acesse a aplicação:
   - Frontend: http://localhost:48030
   - API: http://localhost:48001/api

### Método 2: Deploy no EasyPanel

Para instruções detalhadas sobre como implantar no EasyPanel, consulte o arquivo [EASYPANEL_SETUP.md](./EASYPANEL_SETUP.md).

## Desenvolvimento

### Backend
```bash
cd promobot
npm install
npm run dev
```

### Frontend
```bash
cd promobot/frontend
npm install
npm start
```

## Nova Estrutura do Projeto para Deploy Separado

O projeto foi reorganizado para permitir o deploy separado dos serviços frontend e backend:

```
promobot/
├── backend/            # Serviço backend (API e integração WhatsApp)
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── .env
│   ├── package.json
│   └── src/
├── frontend/           # Serviço frontend (Interface Web)
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── docker-entrypoint.sh
│   ├── .env
│   ├── package.json
│   ├── public/
│   └── src/
└── README.md
``` 