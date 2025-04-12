const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const MessageStatus = require('../models/MessageStatus');
const queueService = require('./queueService');

class CampaignService {
  /**
   * Cria uma nova campanha
   * @param {Object} campaignData - Dados da campanha
   * @returns {Promise<Object>} Campanha criada
   */
  async createCampaign(campaignData) {
    try {
      console.log('[CampaignService] Criando campanha com dados:', JSON.stringify(campaignData, null, 2));
      
      // Os dados já devem estar limpos e validados pelo controller
      
      // Se for campanha de envio imediato, garantir que o status e outros campos estão corretos
      if (campaignData.sendNow === true) {
        console.log('[CampaignService] Processando campanha para envio imediato');
        
        // Garantir status draft para inicio posterior
        campaignData.status = 'draft';
        
        // Remover qualquer scheduledDate que possa existir
        delete campaignData.scheduledDate;
        
        // Verificar mensagem (obrigatória para todas as campanhas)
        if (!campaignData.message) {
          throw new Error('A mensagem é obrigatória para campanhas de envio imediato');
        }
      } 
      // Se for campanha recorrente, verificar configuração de recorrência
      else if (campaignData.isRecurring === true) {
        console.log('[CampaignService] Processando campanha recorrente');
        
        if (!campaignData.recurringType) {
          throw new Error('O tipo de recorrência é obrigatório para campanhas recorrentes');
        }
        
        if (!campaignData.recurringStartDate) {
          throw new Error('A data de início é obrigatória para campanhas recorrentes');
        }
      } 
      // Caso contrário, deve ter data de agendamento
      else if (!campaignData.scheduledDate) {
        console.log('[CampaignService] Erro: Campanha sem agendamento ou configuração para envio imediato');
        throw new Error('É necessário definir uma data de agendamento, configurar recorrência ou ativar envio imediato');
      }
      
      // Verificar se pelo menos uma forma de seleção de contatos está presente
      if (!campaignData.sendToAll && 
          (!campaignData.contacts || campaignData.contacts.length === 0) && 
          (!campaignData.tags || campaignData.tags.length === 0)) {
        console.error('[CampaignService] Erro: Contatos ou tags são obrigatórios quando "enviar para todos" não está ativado');
        throw new Error('Contatos ou tags são obrigatórios quando "enviar para todos" não está ativado');
      }
      
      // Se a opção "enviar para todos" estiver ativada, garantir que não existam contatos ou tags específicos
      if (campaignData.sendToAll === true) {
        campaignData.contacts = [];
        campaignData.tags = [];
      }
      
      // Criar o documento de campanha
      console.log('[CampaignService] Criando documento de campanha');
      const campaign = new Campaign(campaignData);
      
      // Validar o documento antes de salvar
      const validationError = campaign.validateSync();
      if (validationError) {
        console.error('[CampaignService] Erro de validação:', validationError);
        throw validationError;
      }
      
      console.log('[CampaignService] Salvando campanha');
      await campaign.save();
      
      console.log('[CampaignService] Campanha criada com sucesso:', campaign._id);
      return campaign;
    } catch (error) {
      console.error('[CampaignService] Erro ao criar campanha:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as campanhas
   * @param {Object} filter - Filtros opcionais
   * @returns {Promise<Array>} Lista de campanhas
   */
  async getCampaigns(filter = {}) {
    try {
      return await Campaign.find(filter)
        .populate('message')
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      throw error;
    }
  }

  /**
   * Obtém uma campanha pelo ID
   * @param {string} id - ID da campanha
   * @returns {Promise<Object>} Campanha encontrada
   */
  async getCampaignById(id) {
    try {
      return await Campaign.findById(id)
        .populate('message')
        .populate('contacts');
    } catch (error) {
      console.error('Erro ao buscar campanha:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma campanha existente
   * @param {string} id - ID da campanha
   * @param {Object} updateData - Dados para atualização
   * @returns {Promise<Object>} Campanha atualizada
   */
  async updateCampaign(id, updateData) {
    try {
      return await Campaign.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      throw error;
    }
  }

  /**
   * Prepara mensagem para envio, formatando corretamente o conteúdo
   * baseado no tipo de mídia
   * @param {Object} message - Objeto de mensagem do banco de dados
   * @returns {Object} Objeto formatado com dados da mensagem
   * @private
   */
  _prepareMessageForSending(message) {
    // Verificar se temos os dados necessários
    if (!message) {
      throw new Error('Mensagem não definida');
    }

    // Verificar o tipo de mídia
    const hasMedia = message.mediaUrl && message.mediaType && 
                    message.mediaUrl.trim() !== '' &&
                    ['image', 'video', 'document', 'audio'].includes(message.mediaType);

    // Log detalhado para diagnóstico
    console.log(`[CampaignService] Preparando mensagem: ${message._id}`);
    console.log(`[CampaignService] Tipo de conteúdo: ${hasMedia ? 'Mídia' : 'Texto'}`);
    
    if (hasMedia) {
      console.log(`[CampaignService] Mídia detectada - Tipo: ${message.mediaType}, URL: ${message.mediaUrl}`);
      
      // Validar URL de mídia
      if (!message.mediaUrl.startsWith('http')) {
        console.warn(`[CampaignService] URL de mídia inválida: ${message.mediaUrl}`);
        throw new Error('URL de mídia inválida, deve começar com http:// ou https://');
      }
      
      // Para mensagens com mídia, retornar objeto com informações separadas
      return {
        hasMedia: true,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl,
        caption: message.content || '',
        rawText: message.content || ''
      };
    } else {
      // Para mensagens de texto, retornar apenas o conteúdo
      return {
        hasMedia: false,
        text: message.content,
        mediaType: null,
        mediaUrl: null,
        rawText: message.content
      };
    }
  }

  /**
   * Inicia o envio de uma campanha
   * @param {string} campaignId - ID da campanha
   * @returns {Promise<Object>} Resultado da operação
   */
  async startCampaign(campaignId) {
    console.log(`[CampaignService] Iniciando campanha ${campaignId}...`);
    try {
      // Busca a campanha com dados relacionados
      const campaign = await Campaign.findById(campaignId)
        .populate('message')
        .populate('contacts');
      
      if (!campaign) {
        console.error(`[CampaignService] Campanha ${campaignId} não encontrada`);
        throw new Error('Campanha não encontrada');
      }
      
      console.log(`[CampaignService] Campanha encontrada: ${campaign.name} (status: ${campaign.status})`);
      
      if (campaign.status !== 'draft' && campaign.status !== 'paused') {
        console.error(`[CampaignService] Status inválido para iniciar campanha: ${campaign.status}`);
        throw new Error(`Não é possível iniciar campanha com status: ${campaign.status}`);
      }
      
      // Verificar e preparar a mensagem
      if (!campaign.message) {
        throw new Error('Mensagem não definida para esta campanha');
      }
      
      // Preparar a mensagem para envio
      const messageDetails = this._prepareMessageForSending(campaign.message);
      console.log(`[CampaignService] Mensagem preparada: ${messageDetails.hasMedia ? 'Mídia' : 'Texto'}`);
      
      // Verifica se a campanha tem data agendada
      if (campaign.scheduledDate) {
        const scheduledDate = new Date(campaign.scheduledDate);
        const now = new Date();
        
        console.log(`[CampaignService] Campanha com data agendada: ${scheduledDate.toISOString()}`);
        
        // Se a data agendada é no futuro, apenas muda o status para "scheduled"
        if (scheduledDate > now) {
          console.log(`[CampaignService] Data agendada é no futuro, apenas atualizando status para "scheduled"`);
          campaign.status = 'scheduled';
          await campaign.save();
          
          return {
            success: true,
            message: 'Campanha agendada com sucesso',
            campaignId: campaign._id,
            scheduledDate: scheduledDate,
            scheduled: true
          };
        }
        
        console.log(`[CampaignService] Data agendada é no passado ou presente, executando imediatamente`);
      }
      
      // Se não tem data agendada ou a data já passou, executa imediatamente
      // Atualiza o status da campanha para "processing" (mudando de "scheduled" para evitar adição duplicada à fila)
      campaign.status = 'processing';
      await campaign.save();
      console.log(`[CampaignService] Status da campanha atualizado para: processing`);
      
      // Salvar os detalhes da mensagem no objeto da campanha para uso no serviço de fila
      campaign.message.preparedDetails = messageDetails;
      
      // Adiciona todas as mensagens da campanha à fila
      console.log(`[CampaignService] Adicionando mensagens à fila (Total de contatos: ${campaign.contacts?.length || 0})...`);
      const queueResult = await queueService.addCampaignToQueue(campaign);
      console.log(`[CampaignService] Mensagens adicionadas à fila com sucesso:`, queueResult);
      
      return {
        success: true,
        message: 'Campanha iniciada com sucesso',
        campaignId: campaign._id,
        queueStats: queueResult,
        scheduled: false
      };
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      throw error;
    }
  }

  /**
   * Função para pausar uma campanha em andamento
   * @param {string} campaignId - ID da campanha
   * @returns {Promise<Object>} Resultado da operação
   */
  async pauseCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }
      
      if (campaign.status !== 'processing' && campaign.status !== 'scheduled') {
        throw new Error(`Não é possível pausar campanha com status: ${campaign.status}`);
      }
      
      campaign.status = 'paused';
      await campaign.save();
      
      // Opcionalmente, poderíamos pausar a fila ou remover jobs não processados
      // desta campanha específica, mas isso exigiria modificações no Bull
      
      return {
        success: true,
        message: 'Campanha pausada com sucesso',
        campaignId: campaign._id
      };
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
      throw error;
    }
  }

  /**
   * Função para cancelar uma campanha
   * @param {string} campaignId - ID da campanha
   * @returns {Promise<Object>} Resultado da operação
   */
  async cancelCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }
      
      if (campaign.status === 'completed' || campaign.status === 'canceled') {
        throw new Error(`Não é possível cancelar campanha com status: ${campaign.status}`);
      }
      
      campaign.status = 'canceled';
      await campaign.save();
      
      // TODO: Implementar a remoção de jobs pendentes para esta campanha
      // Isso exigiria modificações adicionais no Bull ou armazenar IDs dos jobs
      
      return {
        success: true,
        message: 'Campanha cancelada com sucesso',
        campaignId: campaign._id
      };
    } catch (error) {
      console.error('Erro ao cancelar campanha:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de uma campanha
   * @param {string} campaignId - ID da campanha
   * @returns {Promise<Object>} Estatísticas da campanha
   */
  async getCampaignStatistics(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }
      
      // Além das estatísticas básicas, podemos adicionar mais detalhes
      const messageStatuses = await MessageStatus.find({ campaign: campaignId });
      
      // Calcular estatísticas detalhadas
      const statusCounts = {
        queued: 0,
        processing: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      };
      
      messageStatuses.forEach(status => {
        if (statusCounts[status.status] !== undefined) {
          statusCounts[status.status]++;
        }
      });
      
      // Obter estatísticas da fila
      const queueStats = await queueService.getQueueStats();
      
      return {
        campaignId: campaign._id,
        campaignName: campaign.name,
        status: campaign.status,
        statistics: campaign.statistics,
        statusCounts,
        messageCount: messageStatuses.length,
        queueInfo: queueStats.success ? {
          waiting: queueStats.jobs.waiting,
          active: queueStats.jobs.active,
          estimatedTimeRemaining: queueStats.estimatedTimeRemaining
        } : null
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas da campanha:', error);
      throw error;
    }
  }

  /**
   * Formata o número de telefone adicionando o código do país se necessário
   * @param {string} phoneNumber - Número de telefone
   * @returns {string} Número formatado
   * @private
   */
  _formatPhoneNumber(phoneNumber) {
    // Remove caracteres não numéricos
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Verifica se já tem o código do país e adiciona se necessário
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = `55${formattedNumber}`;
    }
    
    return formattedNumber;
  }

  /**
   * Função auxiliar para aguardar um tempo determinado
   * @param {number} ms - Tempo em milissegundos
   * @returns {Promise<void>}
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica campanhas agendadas pendentes que devem ser iniciadas
   * Esta função deve ser chamada periodicamente
   * @returns {Promise<Object>} Resultado da operação
   */
  async checkPendingScheduledCampaigns() {
    try {
      console.log('[CampaignService] Verificando campanhas agendadas pendentes...');
      const now = new Date();
      
      // Busca campanhas agendadas (não recorrentes) com data no passado
      const campaigns = await Campaign.find({
        status: 'scheduled',
        isRecurring: false,
        scheduledDate: { $lte: now }
      });
      
      console.log(`[CampaignService] Encontradas ${campaigns.length} campanhas agendadas para executar`);
      
      let executed = 0;
      let failed = 0;
      
      // Processa cada campanha agendada
      for (const campaign of campaigns) {
        try {
          console.log(`[CampaignService] Executando campanha agendada: ${campaign.name} (${campaign._id})`);
          
          // Carrega a campanha completa
          const fullCampaign = await Campaign.findById(campaign._id)
            .populate('message')
            .populate('contacts');
            
          // Atualiza o status da campanha para "processing"
          fullCampaign.status = 'processing';
          await fullCampaign.save();
          
          // Adiciona à fila
          await queueService.addCampaignToQueue(fullCampaign);
          
          executed++;
        } catch (error) {
          console.error(`[CampaignService] Erro ao processar campanha agendada ${campaign._id}:`, error);
          failed++;
        }
      }
      
      return {
        success: true,
        total: campaigns.length,
        executed,
        failed
      };
    } catch (error) {
      console.error('[CampaignService] Erro ao verificar campanhas agendadas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new CampaignService(); 