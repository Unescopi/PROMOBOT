# PromoBot - Sistema de Marketing para WhatsApp

PromoBot é uma plataforma completa para gerenciamento de campanhas promocionais via WhatsApp, desenvolvida especialmente para cafeterias e pequenos negócios.

## Características Principais

- **Gerenciamento de Contatos**: Adicione, edite e organize seus contatos com grupos e tags.
- **Criação de Campanhas**: Crie mensagens promocionais com texto, imagens e vídeos.
- **Agendamento**: Programe o envio de campanhas para datas e horários específicos.
- **Estatísticas Detalhadas**: Acompanhe entregas, leituras e engajamento.
- **Personalização**: Envie mensagens personalizadas usando o nome do cliente.
- **Webhook**: Integração com EvolutionAPI para comunicação com WhatsApp.

## Requisitos do Sistema

- Node.js 16.x ou superior
- MongoDB
- EvolutionAPI configurada
- Acesso à internet para comunicação com a API do WhatsApp

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/promobot.git
cd promobot
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env` com suas credenciais:
```
EVOLUTION_API_URL=sua_url_api
EVOLUTION_API_KEY=sua_chave_api
MONGODB_URI=sua_url_mongodb
MONGODB_DB=promobot
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse o sistema no navegador: `http://localhost:3000`

## Tecnologias Utilizadas

- Next.js com App Router
- React.js
- TypeScript
- Tailwind CSS
- MongoDB
- Express (para webhook)

## Estrutura do Projeto

- `/src/app`: Páginas da aplicação
- `/src/components`: Componentes reutilizáveis
- `/src/services`: Serviços para comunicação com APIs
- `/src/lib`: Utilitários e configurações
- `/src/hooks`: Hooks personalizados do React
- `/src/contexts`: Contextos do React para gerenciamento de estado

## Configuração do Webhook

Para configurar a integração com a EvolutionAPI, você precisa:

1. Configurar sua instância da EvolutionAPI
2. Definir o endpoint do webhook nas configurações da EvolutionAPI: `https://seu-dominio.com/api/webhook`
3. Garantir que a chave API está corretamente configurada no arquivo `.env`

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.

## Suporte

Para suporte ou dúvidas, entre em contato através das issues do GitHub ou pelo email: suporte@promobot.com
