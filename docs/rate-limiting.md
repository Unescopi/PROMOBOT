# Sistema de Rate Limiting

O sistema de Rate Limiting implementado no PromoBot visa proteger a API contra abusos, ataques de força bruta e sobrecarga, garantindo que os recursos estejam disponíveis para todos os usuários de forma justa.

## Configurações por Tipo de Rota

### Rate Limiting Global

Todas as rotas são protegidas por um rate limiter padrão que permite:
- **100 requisições** por IP a cada **15 minutos**

### Autenticação

Rotas relacionadas à autenticação (`/api/auth/*`) possuem limites mais restritivos:
- **10 tentativas** por IP a cada **1 hora**
- Respostas bem-sucedidas não contam para o limite
- Ideal para evitar ataques de força bruta em senhas

### Envio de Mensagens

Rotas relacionadas a mensagens e campanhas (`/api/messages/*` e `/api/campaigns/*`):
- **50 requisições** por IP a cada **10 minutos**
- Evita envio em massa abusivo de mensagens

### Evolution API

Rotas que interagem com a API externa do WhatsApp (`/api/evolution-api/*`):
- **30 requisições** por IP a cada **5 minutos**
- Protege a integração com serviços externos

## Headers de Resposta

O sistema retorna os seguintes headers que informam sobre o estado do rate limiting:

- `RateLimit-Limit`: número total de requisições permitidas no período
- `RateLimit-Remaining`: número de requisições restantes no período atual
- `RateLimit-Reset`: tempo em segundos até o reset do contador

## Resposta de Erro

Quando o limite é excedido, a API retorna:
- Status HTTP: **429 Too Many Requests**
- Corpo da resposta: Um objeto JSON com a mensagem informando quanto tempo esperar

## Como Testar

Um script de teste está disponível em `test-rate-limit.js` que pode ser executado para verificar o funcionamento do rate limiting em vários endpoints.

```bash
# Para executar o teste
node test-rate-limit.js
```

## Personalização

Os limites podem ser ajustados no arquivo `src/middleware/rateLimiter.js` conforme necessário para diferentes ambientes (desenvolvimento, produção) ou requisitos específicos.

## Implementação Técnica

O sistema utiliza a biblioteca `express-rate-limit` que armazena contadores em memória. Para uma implementação em larga escala, recomenda-se usar um armazenamento distribuído como Redis com o pacote `rate-limit-redis`. 