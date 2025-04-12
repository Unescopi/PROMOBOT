const Queue = require('bull');
const evolutionApiService = require('./evolutionApiService');
const MessageStatus = require('../models/MessageStatus');
const Campaign = require('../models/Campaign');

// Verificar se as variáveis de ambiente necessárias estão configuradas
const redisEnabled = process.env.REDIS_ENABLED !== 'false';

// Configuração do Redis
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    // Timeout para conexão com Redis
    connectTimeout: 5000,
    // Tentativas de reconexão
    maxRetriesPerRequest: 3
  }
};

// Definição das filas
let messageQueue;
try {
  if (redisEnabled) {
    messageQueue = new Queue('message-sending', redisConfig);
    console.log('Sistema de filas inicializado com Redis');
  } else {
    console.log('Sistema de filas em modo mock (Redis desativado)');
  }
} catch (error) {
  console.error('Erro ao inicializar filas com Redis:', error.message);
  console.log('Sistema de filas em modo de fallback (sem Redis)');
  // Não interrompe a execução - o sistema vai operar sem o sistema de filas
}

const CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || '5'); // Número de jobs processados simultaneamente
const MAX_ATTEMPTS = 3; // Tentativas máximas para cada mensagem

// Configuração de limites para evitar bloqueio do WhatsApp
const RATE_LIMIT = {
  // Padrão recomendado para evitar bloqueio do WhatsApp
  messagesPerMinute: parseInt(process.env.WHATSAPP_MESSAGES_PER_MINUTE || '20'),
  messagesPerDay: parseInt(process.env.WHATSAPP_MESSAGES_PER_DAY || '1000'),
  limiterEnabled: process.env.ENABLE_WHATSAPP_LIMITS !== 'false'
};

/**
 * Converte milissegundos em uma string formatada
 * @param {number} ms - Tempo em milissegundos
 * @returns {string} Tempo formatado
 */
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

// Criar uma referência global ao serviço de fila
let queueServiceInstance;

class QueueService {
  constructor() {
    this.queueEnabled = redisEnabled && messageQueue !== undefined;
    this.fallbackMode = !this.queueEnabled;
    
    if (this.fallbackMode) {
      console.warn('QueueService iniciado em modo de fallback: mensagens serão enviadas diretamente');
    }
    
    // Armazenar a instância para uso no processador
    queueServiceInstance = this;
  }

  /**
   * Verifica se todas as mensagens de uma campanha foram processadas e atualiza o status
   * @param {string} campaignId - ID da campanha
   * @private
   */
  async _checkAndUpdateCampaignStatus(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return;

      // Se a campanha não estiver em processamento, não fazemos nada
      if (campaign.status !== 'processing') return;

      const stats = campaign.statistics || {};
      const total = stats.total || 0;
      const processed = (stats.sent || 0) + (stats.failed || 0);

      console.log(`[QueueService] Verificando status da campanha ${campaignId}: ${processed}/${total} mensagens processadas`);

      // Se todas as mensagens foram processadas, atualizar status da campanha
      if (processed >= total && total > 0) {
        let newStatus;
        // Se todas as mensagens falharam, definir status como 'failed'
        if (stats.failed === total) {
          newStatus = 'failed';
        } 
        // Se mais da metade das mensagens falharam, também definir como 'failed'
        else if (stats.failed > total / 2) {
          newStatus = 'failed';
        }
        // Caso contrário, definir como 'completed'
        else {
          newStatus = 'completed';
        }

        console.log(`[QueueService] Atualizando status da campanha ${campaignId} para '${newStatus}'`);
        
        await Campaign.findByIdAndUpdate(campaignId, {
          status: newStatus,
          completedAt: new Date()
        });
      }
    } catch (error) {
      console.error(`[QueueService] Erro ao verificar status da campanha ${campaignId}:`, error);
    }
  }

  /**
   * Envia uma mensagem diretamente, sem usar a fila (modo fallback)
   * @private
   */
  async _sendDirectMessage(phoneNumber, message, messageType, mediaUrl, mediaType, caption, options) {
    try {
      // Criar MessageStatus se necessário
      let messageStatusId = null;
      const { campaignId, contactId, messageId } = options || {};
      
      if (campaignId && contactId && messageId) {
        const messageStatus = new MessageStatus({
          campaign: campaignId,
          contact: contactId,
          message: messageId,
          status: 'processing',
          queuedAt: new Date(),
          processingStartedAt: new Date()
        });
        await messageStatus.save();
        messageStatusId = messageStatus._id;
      }
      
      // Define a chave API interna para evitar rate limits
      evolutionApiService.setInternalKey(process.env.INTERNAL_API_KEY);
      
      // Enviar mensagem
      let response;
      try {
        console.log(`[QueueService] Enviando mensagem ${messageType === 'media' ? 'com mídia' : 'de texto'} para ${phoneNumber}`);
        
        if (messageType === 'media' && mediaUrl && mediaType) {
          console.log(`[QueueService] Tipo de mídia: ${mediaType}, URL: ${mediaUrl}, Caption: ${caption || ''}`);
          
          response = await evolutionApiService.sendMediaMessage(
            phoneNumber,
            caption || '',
            mediaUrl,
            mediaType
          );
        } else {
          console.log(`[QueueService] Mensagem de texto: ${message}`);
          
          if (!message || typeof message !== 'string') {
            throw new Error(`Mensagem de texto inválida: ${message}`);
          }
          
          response = await evolutionApiService.sendTextMessage(
            phoneNumber,
            message
          );
        }
        
        // Atualizar MessageStatus para sucesso
        if (messageStatusId) {
          await MessageStatus.findByIdAndUpdate(messageStatusId, {
            status: 'sent',
            evolutionApiMessageId: response.key?.id,
            sentAt: new Date()
          });
        }
        
        // Atualiza estatísticas da campanha
        if (campaignId) {
          await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { 'statistics.sent': 1 }
          });
        }
        
        return {
          success: true,
          messageId: response.key?.id,
          timestamp: new Date(),
          phoneNumber
        };
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${phoneNumber} (modo direto):`, error.message);
        
        // Se houver erro com mídia, tentar enviar apenas o texto como fallback
        if (messageType === 'media' && caption && caption.trim()) {
          try {
            console.log(`[QueueService] Tentando enviar apenas o texto como fallback: ${caption}`);
            response = await evolutionApiService.sendTextMessage(phoneNumber, caption);
            
            if (messageStatusId) {
              await MessageStatus.findByIdAndUpdate(messageStatusId, {
                status: 'sent',
                evolutionApiMessageId: response.key?.id,
                sentAt: new Date(),
                note: 'Enviado apenas o texto, mídia falhou'
              });
            }
            
            if (campaignId) {
              await Campaign.findByIdAndUpdate(campaignId, {
                $inc: { 'statistics.sent': 1 }
              });
            }
            
            return {
              success: true,
              messageId: response.key?.id,
              timestamp: new Date(),
              phoneNumber,
              note: 'Enviado apenas o texto, mídia falhou'
            };
          } catch (textError) {
            console.error(`[QueueService] Também falhou ao enviar texto: ${textError.message}`);
          }
        }
        
        // Atualizar MessageStatus para falha
        if (messageStatusId) {
          await MessageStatus.findByIdAndUpdate(messageStatusId, {
            status: 'failed',
            failReason: error.message,
            failedAt: new Date()
          });
        }
        
        // Atualiza estatísticas da campanha
        if (campaignId) {
          await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { 'statistics.failed': 1 }
          });
        }
        
        throw error;
      } finally {
        // Limpa a chave API interna
        evolutionApiService.clearInternalKey();
      }
    } catch (error) {
      console.error('Erro ao processar envio direto:', error);
      throw error;
    }
  }

  /**
   * Adiciona uma mensagem da campanha à fila
   * @param {string} campaignId ID da campanha
   * @param {string} contactNumber Número do contato
   * @param {string} message Mensagem a ser enviada
   * @param {string} contactName Nome do contato (opcional)
   */
  async addMessageToQueue(campaignId, contactNumber, message, contactName = '') {
    try {
      console.log(`[QueueService] Adicionando mensagem para ${contactNumber} da campanha ${campaignId}`);
      
      // Verificar se a mensagem contém variáveis e substituí-las
      const processedMessage = this._processMessageVariables(message, contactName);
      
      // Extrair URL de mídia e tipo se houver
      const { hasMedia, text, mediaUrl, mediaType } = this._extractMediaInfo(processedMessage);
      
      // Criar entrada para o log de mensagens
      const messageStatus = new MessageStatus({
        campaignId,
        contactNumber,
        message: processedMessage,
        status: 'queued',
        createdAt: new Date()
      });
      
      await messageStatus.save();
      
      // Dados para a fila
      const queueData = {
        campaignId,
        contactNumber,
        messageStatusId: messageStatus._id,
        hasMedia,
        text,
        mediaUrl,
        mediaType
      };
      
      if (this.queueEnabled) {
        // Adicionar à fila Redis
        await messageQueue.add('sendMessage', queueData, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        });
        console.log(`[QueueService] Mensagem adicionada à fila para ${contactNumber}`);
      } else {
        // Modo de fallback - enviar diretamente
        console.log(`[QueueService] Redis desativado. Enviando mensagem diretamente para ${contactNumber}`);
        await this._processMessage(queueData);
      }
      
      return messageStatus._id;
    } catch (error) {
      console.error(`[QueueService] Erro ao adicionar mensagem à fila: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Extrai informações de mídia da mensagem se houver
   * @param {string} message Mensagem a ser processada
   * @returns {Object} Objeto com informações de mídia e texto
   */
  _extractMediaInfo(message) {
    try {
      if (!message || typeof message !== 'string') {
        console.warn(`[QueueService] Mensagem inválida para extração de mídia: ${typeof message}`);
        return {
          hasMedia: false,
          text: message || '',
          mediaUrl: null,
          mediaType: null
        };
      }

      console.log(`[QueueService] Analisando mensagem para mídia: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      
      // Expressão regular para encontrar URL e tipo de mídia
      // Formato esperado: [media:tipo:url]texto da mensagem
      const mediaRegex = /^\s*\[media:(image|video|audio|document):([^\]]+)\](.*)$/is;
      const match = message.match(mediaRegex);
      
      if (match) {
        const mediaType = match[1].trim().toLowerCase();
        const mediaUrl = match[2].trim();
        const text = match[3].trim();
        
        console.log(`[QueueService] ✅ Mídia detectada - Tipo: ${mediaType}, URL: ${mediaUrl}`);
        console.log(`[QueueService] Texto da legenda: ${text}`);
        
        // Validação adicional para garantir que a URL tenha formato correto
        if (!mediaUrl.startsWith('http')) {
          console.warn(`[QueueService] URL de mídia inválida, não começa com http: ${mediaUrl}`);
        }
        
        return {
          hasMedia: true,
          text: text,
          mediaUrl: mediaUrl,
          mediaType: mediaType
        };
      }
      
      console.log(`[QueueService] Nenhuma mídia detectada, tratando como mensagem de texto`);
      return {
        hasMedia: false,
        text: message,
        mediaUrl: null,
        mediaType: null
      };
    } catch (error) {
      console.error(`[QueueService] Erro ao extrair informações de mídia: ${error.message}`);
      return {
        hasMedia: false,
        text: message || '',
        mediaUrl: null,
        mediaType: null
      };
    }
  }

  /**
   * Processa uma mensagem da fila
   * @param {Object} job Dados do job
   */
  async _processMessage(job) {
    try {
      const { campaignId, contactNumber, messageStatusId, hasMedia, text, mediaUrl, mediaType } = job;
      
      console.log(`[QueueService] Processando mensagem ${messageStatusId} para ${contactNumber}`);
      
      // Atualizar status para 'sending'
      await MessageStatus.findByIdAndUpdate(messageStatusId, {
        status: 'sending',
        updatedAt: new Date()
      });
      
      // Enviar a mensagem através do serviço da API
      let result;
      
      if (hasMedia && mediaUrl && mediaType) {
        console.log(`[QueueService] Enviando mensagem de mídia tipo ${mediaType}`);
        result = await this._sendDirectMessage(contactNumber, text, 'media', mediaUrl, mediaType, null, { campaignId });
      } else {
        console.log(`[QueueService] Enviando mensagem de texto`);
        result = await this._sendDirectMessage(contactNumber, text, 'text', null, null, null, { campaignId });
      }
      
      // Atualizar status para 'sent'
      await MessageStatus.findByIdAndUpdate(messageStatusId, {
        status: 'sent',
        apiResponse: JSON.stringify(result),
        sentAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`[QueueService] Mensagem ${messageStatusId} enviada com sucesso para ${contactNumber}`);
      
      // Verificar se todas as mensagens foram enviadas
      await this._checkAndUpdateCampaignStatus(campaignId);
      
      return { success: true, messageStatusId };
    } catch (error) {
      console.error(`[QueueService] Erro ao processar mensagem: ${error.message}`);
      
      // Obter dados do job para registro adequado
      const { messageStatusId, contactNumber } = job;
      
      // Atualizar status para 'failed'
      if (messageStatusId) {
        try {
          await MessageStatus.findByIdAndUpdate(messageStatusId, {
            status: 'failed',
            error: error.message,
            updatedAt: new Date()
          });
        } catch (updateError) {
          console.error(`[QueueService] Erro ao atualizar status da mensagem: ${updateError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Adiciona uma mensagem de texto à fila
   * @param {string} phoneNumber - Número do telefone
   * @param {string} message - Texto da mensagem
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Resultado da operação
   */
  async addTextMessage(phoneNumber, message, options = {}) {
    // Se em modo fallback, enviar diretamente
    if (this.fallbackMode) {
      return this._sendDirectMessage(phoneNumber, message, 'text', null, null, null, options);
    }
    
    const { campaignId, contactId, messageId, priority = 0, delay = 0 } = options;
    
    try {
      // Cria um registro de status se for parte de uma campanha
      let messageStatusId = null;
      if (campaignId && contactId && messageId) {
        const messageStatus = new MessageStatus({
          campaign: campaignId,
          contact: contactId,
          message: messageId,
          status: 'queued',
          queuedAt: new Date()
        });
        await messageStatus.save();
        messageStatusId = messageStatus._id;
      }
      
      // Adiciona à fila
      const job = await messageQueue.add({
        phoneNumber,
        messageType: 'text',
        message,
        campaignId,
        contactId,
        messageId,
        messageStatusId,
        addedAt: new Date()
      }, {
        priority,
        delay,
        attempts: MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 500
      });
      
      return {
        success: true,
        jobId: job.id,
        messageStatusId,
        estimatedDelay: formatTime(delay + job.delay)
      };
    } catch (error) {
      console.error('Erro ao adicionar mensagem de texto à fila:', error);
      
      // Em caso de erro na fila, tentar envio direto como fallback de último recurso
      if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('Redis is not available'))) {
        console.warn('Erro na conexão com Redis. Tentando envio direto como fallback...');
        return this._sendDirectMessage(phoneNumber, message, 'text', null, null, null, options);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Adiciona uma mensagem de mídia à fila
   * @param {string} phoneNumber - Número do telefone
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia (image, video, document, audio)
   * @param {string} caption - Legenda da mídia
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Resultado da operação
   */
  async addMediaMessage(phoneNumber, mediaUrl, mediaType, caption = '', options = {}) {
    // Se em modo fallback, enviar diretamente
    if (this.fallbackMode) {
      return this._sendDirectMessage(phoneNumber, null, 'media', mediaUrl, mediaType, caption, options);
    }
    
    const { campaignId, contactId, messageId, priority = 0, delay = 0 } = options;
    
    try {
      // Cria um registro de status se for parte de uma campanha
      let messageStatusId = null;
      if (campaignId && contactId && messageId) {
        const messageStatus = new MessageStatus({
          campaign: campaignId,
          contact: contactId,
          message: messageId,
          status: 'queued',
          queuedAt: new Date()
        });
        await messageStatus.save();
        messageStatusId = messageStatus._id;
      }
      
      // Adiciona à fila
      const job = await messageQueue.add({
        phoneNumber,
        messageType: 'media',
        mediaUrl,
        mediaType,
        caption,
        campaignId,
        contactId,
        messageId,
        messageStatusId,
        addedAt: new Date()
      }, {
        priority,
        delay,
        attempts: MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 500
      });
      
      return {
        success: true,
        jobId: job.id,
        messageStatusId,
        estimatedDelay: formatTime(delay + job.delay)
      };
    } catch (error) {
      console.error('Erro ao adicionar mensagem de mídia à fila:', error);
      
      // Em caso de erro na fila, tentar envio direto como fallback de último recurso
      if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('Redis is not available'))) {
        console.warn('Erro na conexão com Redis. Tentando envio direto como fallback...');
        return this._sendDirectMessage(phoneNumber, null, 'media', mediaUrl, mediaType, caption, options);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Adiciona todas as mensagens de uma campanha à fila
   * @param {Object} campaign - Campanha com contatos e mensagem populados
   * @returns {Promise<Object>} Resultado da operação
   */
  async addCampaignToQueue(campaign) {
    console.log(`[QueueService] Iniciando adição de campanha à fila: ${campaign._id}`);
    try {
      const { _id: campaignId, message, contacts } = campaign;
      
      // Verifica se a campanha tem uma mensagem e contatos
      if (!message || !contacts || contacts.length === 0) {
        console.error(`[QueueService] Campanha ${campaignId} sem mensagem ou contatos`);
        throw new Error('Campanha sem mensagem ou contatos');
      }
      
      console.log(`[QueueService] Detalhes da campanha: Message ID: ${message._id}, Contatos: ${contacts.length}`);
      
      const messageId = message._id;
      
      // Usar os detalhes preparados, se disponíveis, ou extrair as informações da mídia
      const messageDetails = message.preparedDetails || this._extractMessageDetails(message);
      
      console.log(`[QueueService] Tipo de mensagem: ${messageDetails.hasMedia ? 'Mídia' : 'Texto'}`);
      if (messageDetails.hasMedia) {
        console.log(`[QueueService] Tipo de mídia: ${messageDetails.mediaType}, URL: ${messageDetails.mediaUrl}`);
      }
      
      const total = contacts.length;
      let queued = 0;
      let failed = 0;
      
      // Calcular o intervalo para distribuir o envio
      // Estratégia: enviar ao longo do tempo para evitar bloqueios
      const totalMinutes = Math.max(1, Math.ceil(total / RATE_LIMIT.messagesPerMinute));
      const totalTime = totalMinutes * 60 * 1000; // em milissegundos
      const interval = Math.floor(totalTime / total);
      
      console.log(`[QueueService] Enfileirando ${total} mensagens para a campanha ${campaignId}. Tempo estimado: ${formatTime(totalTime)}`);
      console.log(`[QueueService] Intervalo entre mensagens: ${interval}ms, Modo Fallback: ${this.fallbackMode}`);
      
      // Enfileira cada contato com um intervalo progressivo
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const delay = i * interval;
        
        try {
          // Adiciona à fila de acordo com o tipo de mensagem
          let result;
          if (messageDetails.hasMedia) {
            console.log(`[QueueService] Adicionando mensagem de mídia para ${contact.phoneNumber} com delay ${delay}ms`);
            result = await this.addMediaMessage(
              contact.phoneNumber,
              messageDetails.mediaUrl,
              messageDetails.mediaType,
              messageDetails.caption,
              {
                campaignId,
                contactId: contact._id,
                messageId,
                priority: 10, // Prioridade baixa para campanhas (1-10, menor = mais prioritário)
                delay
              }
            );
          } else {
            console.log(`[QueueService] Adicionando mensagem de texto para ${contact.phoneNumber} com delay ${delay}ms`);
            result = await this.addTextMessage(
              contact.phoneNumber,
              messageDetails.text,
              {
                campaignId,
                contactId: contact._id,
                messageId,
                priority: 10,
                delay
              }
            );
          }
          
          if (result.success) {
            queued++;
          } else {
            failed++;
            console.error(`[QueueService] Falha ao adicionar mensagem para ${contact.phoneNumber}:`, result.error);
          }
        } catch (err) {
          failed++;
          console.error(`[QueueService] Erro ao processar mensagem para ${contact.phoneNumber}:`, err.message);
        }
        
        if (i % 10 === 0 || i === contacts.length - 1) {
          console.log(`[QueueService] Progresso: ${i+1}/${total} mensagens processadas (${queued} enfileiradas, ${failed} falhas)`);
        }
      }
      
      console.log(`[QueueService] Atualizando status da campanha para 'processing'`);
      // Atualiza o status da campanha
      await Campaign.findByIdAndUpdate(campaignId, {
        status: 'processing',
        'statistics.queued': queued,
        'statistics.total': total,
        'statistics.failed': failed
      });
      
      const result = {
        success: true,
        campaignId,
        totalMessages: total,
        queuedMessages: queued,
        failedMessages: failed,
        estimatedTime: formatTime(totalTime)
      };
      
      console.log(`[QueueService] Campanha adicionada à fila com sucesso:`, result);
      return result;
    } catch (error) {
      console.error('[QueueService] Erro ao adicionar campanha à fila:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Extrai detalhes da mensagem para processamento
   * @param {Object} message Objeto de mensagem
   * @returns {Object} Detalhes formatados da mensagem
   * @private
   */
  _extractMessageDetails(message) {
    if (!message) {
      return {
        hasMedia: false,
        text: '',
        mediaUrl: null,
        mediaType: null
      };
    }
    
    const hasMedia = message.mediaUrl && message.mediaType && 
                    message.mediaUrl.trim() !== '' &&
                    ['image', 'video', 'document', 'audio'].includes(message.mediaType);
    
    if (hasMedia) {
      return {
        hasMedia: true,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl,
        caption: message.content || ''
      };
    } else {
      return {
        hasMedia: false,
        text: message.content,
        mediaUrl: null,
        mediaType: null
      };
    }
  }
  
  /**
   * Obtém estatísticas da fila
   * @returns {Promise<Object>} Estatísticas da fila
   */
  async getQueueStats() {
    try {
      // Se estiver em modo fallback, retorna estatísticas simuladas
      if (this.fallbackMode) {
        return {
          success: true,
          fallbackMode: true,
          message: 'Sistema de filas em modo fallback (sem Redis)',
          jobs: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            total: 0
          },
          config: {
            concurrency: CONCURRENCY,
            maxAttempts: MAX_ATTEMPTS,
            messagesPerMinute: RATE_LIMIT.messagesPerMinute,
            messagesPerDay: RATE_LIMIT.messagesPerDay,
            limiterEnabled: RATE_LIMIT.limiterEnabled
          },
          estimatedTimeRemaining: '0s'
        };
      }
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        messageQueue.getWaitingCount(),
        messageQueue.getActiveCount(),
        messageQueue.getCompletedCount(),
        messageQueue.getFailedCount(),
        messageQueue.getDelayedCount()
      ]);
      
      const jobs = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
      
      // Estimativa de tempo para processar todos os jobs pendentes
      const pendingJobs = waiting + delayed;
      const estimatedSecondsPerJob = 1.5; // Considerando os limites de taxa
      const estimatedTimeRemaining = pendingJobs * estimatedSecondsPerJob * 1000 / CONCURRENCY;
      
      return {
        success: true,
        jobs,
        config: {
          concurrency: CONCURRENCY,
          maxAttempts: MAX_ATTEMPTS,
          messagesPerMinute: RATE_LIMIT.messagesPerMinute,
          messagesPerDay: RATE_LIMIT.messagesPerDay,
          limiterEnabled: RATE_LIMIT.limiterEnabled
        },
        estimatedTimeRemaining: formatTime(estimatedTimeRemaining)
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas da fila:', error);
      return {
        success: false,
        error: error.message,
        fallbackMode: this.fallbackMode
      };
    }
  }
  
  /**
   * Pausa a fila de processamento
   */
  async pauseQueue() {
    if (this.fallbackMode) {
      return { 
        success: false, 
        message: 'Operação não suportada em modo fallback',
        fallbackMode: true
      };
    }
    
    try {
      await messageQueue.pause();
      return { success: true, message: 'Fila pausada com sucesso' };
    } catch (error) {
      console.error('Erro ao pausar fila:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Retoma o processamento da fila
   */
  async resumeQueue() {
    if (this.fallbackMode) {
      return { 
        success: false, 
        message: 'Operação não suportada em modo fallback',
        fallbackMode: true
      };
    }
    
    try {
      await messageQueue.resume();
      return { success: true, message: 'Processamento da fila retomado com sucesso' };
    } catch (error) {
      console.error('Erro ao retomar fila:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Limpa a fila (remove todos os jobs pendentes)
   * @param {boolean} removeActive - Se true, remove também os jobs ativos
   */
  async clearQueue(removeActive = false) {
    if (this.fallbackMode) {
      return { 
        success: false, 
        message: 'Operação não suportada em modo fallback',
        fallbackMode: true
      };
    }
    
    try {
      if (removeActive) {
        await messageQueue.empty();
        return { success: true, message: 'Fila esvaziada completamente' };
      } else {
        await messageQueue.clean(0, 'wait');
        await messageQueue.clean(0, 'delayed');
        return { success: true, message: 'Jobs pendentes removidos da fila' };
      }
    } catch (error) {
      console.error('Erro ao limpar fila:', error);
      return { success: false, error: error.message };
    }
  }
}

// Configurar eventos da fila e processador somente se o Redis estiver configurado
if (messageQueue && redisEnabled) {
  // Processa as mensagens da fila
  messageQueue.process(CONCURRENCY, async (job) => {
    const { phoneNumber, message, messageType, mediaUrl, mediaType, caption, campaignId, contactId, messageId, messageStatusId } = job.data;
    
    try {
      // Define a chave API interna para evitar rate limits
      evolutionApiService.setInternalKey(process.env.INTERNAL_API_KEY);
      
      // Atualiza o status para "processando"
      if (messageStatusId) {
        await MessageStatus.findByIdAndUpdate(messageStatusId, {
          status: 'processing',
          processingStartedAt: new Date()
        });
      }
      
      // Escolhe o método de envio baseado no tipo de mensagem
      let response;
      if (messageType === 'media') {
        response = await evolutionApiService.sendMediaMessage(
          phoneNumber,
          caption || '',
          mediaUrl,
          mediaType
        );
      } else {
        response = await evolutionApiService.sendTextMessage(
          phoneNumber,
          message
        );
      }
      
      // Atualiza o status para "enviado"
      if (messageStatusId) {
        await MessageStatus.findByIdAndUpdate(messageStatusId, {
          status: 'sent',
          evolutionApiMessageId: response.key?.id,
          sentAt: new Date()
        });
      }
      
      // Atualiza estatísticas da campanha
      if (campaignId) {
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: { 'statistics.sent': 1 }
        });

        // Verificar se todas as mensagens foram processadas e atualizar status da campanha
        if (queueServiceInstance) {
          await queueServiceInstance._checkAndUpdateCampaignStatus(campaignId);
        } else {
          console.warn(`[QueueService] Instância não disponível para verificar status da campanha ${campaignId}`);
          // Alternativa: implementar a lógica diretamente aqui
          await checkCampaignStatus(campaignId);
        }
      }
      
      // Limpa a chave API interna
      evolutionApiService.clearInternalKey();
      
      return {
        success: true,
        messageId: response.key?.id,
        timestamp: new Date(),
        phoneNumber
      };
    } catch (error) {
      // Limpa a chave API interna em caso de erro
      evolutionApiService.clearInternalKey();
      
      console.error(`Erro ao enviar mensagem para ${phoneNumber}:`, error.message);
      
      // Atualiza o status para "falha" se atingir o máximo de tentativas
      if (messageStatusId && job.attemptsMade >= MAX_ATTEMPTS - 1) {
        await MessageStatus.findByIdAndUpdate(messageStatusId, {
          status: 'failed',
          failReason: error.message,
          failedAt: new Date()
        });
        
        // Atualiza estatísticas da campanha
        if (campaignId) {
          await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { 'statistics.failed': 1 }
          });

          // Verificar se todas as mensagens foram processadas e atualizar status da campanha
          if (queueServiceInstance) {
            await queueServiceInstance._checkAndUpdateCampaignStatus(campaignId);
          } else {
            console.warn(`[QueueService] Instância não disponível para verificar status da campanha ${campaignId}`);
            // Alternativa: implementar a lógica diretamente aqui
            await checkCampaignStatus(campaignId);
          }
        }
      }
      
      throw new Error(`Falha ao enviar mensagem: ${error.message}`);
    }
  });

  // Função auxiliar para verificar status da campanha (caso a instância não esteja disponível)
  async function checkCampaignStatus(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return;

      // Se a campanha não estiver em processamento, não fazemos nada
      if (campaign.status !== 'processing') return;

      const stats = campaign.statistics || {};
      const total = stats.total || 0;
      const processed = (stats.sent || 0) + (stats.failed || 0);

      console.log(`[QueueService] Verificando status da campanha ${campaignId}: ${processed}/${total} mensagens processadas`);

      // Se todas as mensagens foram processadas, atualizar status da campanha
      if (processed >= total && total > 0) {
        let newStatus;
        // Se todas as mensagens falharam, definir status como 'failed'
        if (stats.failed === total) {
          newStatus = 'failed';
        } 
        // Se mais da metade das mensagens falharam, também definir como 'failed'
        else if (stats.failed > total / 2) {
          newStatus = 'failed';
        }
        // Caso contrário, definir como 'completed'
        else {
          newStatus = 'completed';
        }

        console.log(`[QueueService] Atualizando status da campanha ${campaignId} para '${newStatus}'`);
        
        await Campaign.findByIdAndUpdate(campaignId, {
          status: newStatus,
          completedAt: new Date()
        });
      }
    } catch (error) {
      console.error(`[QueueService] Erro ao verificar status da campanha ${campaignId}:`, error);
    }
  }

  // Configurar eventos da fila para monitoramento
  messageQueue.on('completed', (job, result) => {
    console.log(`Mensagem enviada com sucesso para ${result.phoneNumber}, ID: ${result.messageId}`);
  });

  messageQueue.on('failed', (job, error) => {
    console.error(`Falha no job ${job.id} após ${job.attemptsMade} tentativas: ${error.message}`);
  });

  messageQueue.on('stalled', (job) => {
    console.warn(`Job ${job.id} parado (stalled)`);
  });

  messageQueue.on('error', (error) => {
    console.error(`Erro no sistema de filas: ${error.message}`);
  });

  // Adiciona limites de taxa globais baseados em Redis
  if (RATE_LIMIT.limiterEnabled) {
    // Limita X mensagens por minuto
    messageQueue.limiter = {
      max: RATE_LIMIT.messagesPerMinute,
      duration: 60 * 1000, // 1 minuto em ms
    };
    
    console.log(`Limitador de taxa ativado: ${RATE_LIMIT.messagesPerMinute} mensagens/minuto`);
  }
}

module.exports = new QueueService(); 