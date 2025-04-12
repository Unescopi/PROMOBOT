# Sistema de Filas para Envio de Mensagens

O PromoBot implementa um sistema de filas robusto para gerenciar o envio de mensagens em grande escala, garantindo maior confiabilidade, escalabilidade e prevenção de bloqueios do WhatsApp.

## Principais Características

### Processamento Distribuído
- **Processamento Assíncrono**: Separa o recebimento das solicitações do processamento efetivo
- **Throughput Controlado**: Define quantas mensagens podem ser processadas simultaneamente
- **Rate Limiting**: Limita automaticamente o número de mensagens enviadas por minuto
- **Distribução no Tempo**: Distribui o envio de campanhas grandes ao longo do tempo

### Confiabilidade
- **Retentativas Automáticas**: Tenta novamente mensagens que falharam com backoff exponencial
- **Persistência**: Armazena jobs no Redis, sobrevivendo a reinicializações do sistema
- **Monitoramento**: Fornece estatísticas detalhadas sobre o estado da fila
- **Gerenciamento de Estado**: Rastreia cada etapa do processo (enfileirado, processando, enviado, entregue)

### Priorização
- **Níveis de Prioridade**: Permite definir a prioridade relativa das mensagens
- **Agendamento Futuro**: Suporta envio de mensagens com atraso específico
- **Campanhas vs. Mensagens Individuais**: Prioriza mensagens individuais sobre campanhas em massa

## Arquitetura

O sistema de filas usa a biblioteca Bull, que trabalha com Redis como armazenamento:

- **Producer**: Adiciona mensagens à fila (`queueService.addTextMessage()`, `queueService.addCampaignToQueue()`)
- **Queue**: Gerencia os jobs pendentes e sua ordem de execução
- **Worker**: Processa as mensagens da fila e interage com a Evolution API
- **Event Listeners**: Monitoram o status dos jobs (concluído, falha, parado)

## Configuração

As configurações do sistema de filas podem ser ajustadas através de variáveis de ambiente:

```
# Redis (armazenamento da fila)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Configurações da fila
QUEUE_CONCURRENCY=5  # Número de mensagens processadas simultaneamente

# Limites para evitar bloqueio do WhatsApp
WHATSAPP_MESSAGES_PER_MINUTE=20
WHATSAPP_MESSAGES_PER_DAY=1000
ENABLE_WHATSAPP_LIMITS=true
```

## API de Gerenciamento

O sistema expõe endpoints para gerenciar a fila:

### Estatísticas
- `GET /api/queue/stats`: Obter estatísticas da fila (pendentes, ativos, concluídos)

### Controle
- `POST /api/queue/pause`: Pausar o processamento da fila
- `POST /api/queue/resume`: Retomar o processamento
- `DELETE /api/queue/clear`: Limpar a fila (remover mensagens pendentes)

### Envio
- `POST /api/queue/send/text`: Enviar mensagem de texto para um único destinatário
- `POST /api/queue/send/media`: Enviar mensagem com mídia para um único destinatário

## Lógica de Distribuição de Campanhas

Quando uma campanha com muitos contatos é iniciada, o sistema:

1. Calcula o tempo total necessário com base no limite de mensagens/minuto
2. Distribui as mensagens ao longo desse período, enfileirando-as com atrasos progressivos
3. Adiciona cada mensagem à fila com sua própria metadata e rastreamento
4. Retorna imediatamente ao usuário um tempo estimado de conclusão

Este método garante que campanhas grandes sejam processadas de forma eficiente sem sobrecarregar o sistema ou triggers anti-spam do WhatsApp.

## Integração com Outros Serviços

O sistema de filas se integra com:

- **Serviço de Campanha**: Para gerenciar o envio em massa
- **Evolution API**: Para o envio efetivo de mensagens para o WhatsApp
- **Banco de Dados**: Para persistir os status de cada mensagem
- **Sistema de Rate Limiting**: Para evitar exceder limites de API

## Benefícios

1. **Prevenção de Bloqueios**: Controle preciso do fluxo de mensagens enviadas
2. **Melhor Experiência**: Interface responsiva mesmo durante envios grandes
3. **Resiliência**: Recuperação automática de falhas (rede, API externa, etc.)
4. **Transparência**: Rastreamento do progresso e status de cada mensagem
5. **Escalabilidade**: Facilidade para escalar horizontalmente com múltiplos workers 