const MessageStatus = require('../models/MessageStatus');
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const notificationService = require('./notificationService');

class WebhookService {
  constructor() {
    if (WebhookService.instance) {
      return WebhookService.instance;
    }
    
    this.notificationService = notificationService;
    WebhookService.instance = this;
  }

  /**
   * Processa eventos de webhook da Evolution API
   * @param {Object} data - Dados do webhook
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processWebhook(data) {
    try {
      // Verificar o tipo de evento
      const { event, instance, info } = data;
      
      if (!event || !instance) {
        return { success: false, message: 'Dados de webhook inválidos' };
      }
      
      console.log(`[Webhook] Processando evento ${event}`, {
        instance,
        info: info ? JSON.stringify(info) : 'Sem info'
      });
      
      // Processar de acordo com o tipo de evento
      switch (event) {
        case 'messages.upsert':
          return await this._processNewMessage(data);
        case 'messages.ack':
          return await this._processMessageAck(data);
        case 'messages.status':
          return await this._processMessageStatus(data);
        case 'connection.update':
          return await this._processConnectionUpdate(data);
        case 'qrcode.updated':
          return await this._processQrCodeUpdate(data);
        case 'groups.upsert':
          return await this._processGroupUpdate(data);
        case 'contacts.upsert':
          return await this._processContactUpdate(data);
        case 'presence.update':
          return await this._processPresenceUpdate(data);
        case 'chats.upsert':
          return await this._processChatUpdate(data);
        case 'group.participants.update':
          return await this._processGroupParticipantsUpdate(data);
        default:
          console.log(`[Webhook] Evento não processado: ${event}`);
          return { success: true, message: `Evento ${event} recebido, mas não processado` };
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa novas mensagens recebidas
   * @param {Object} data - Dados do webhook
   * @returns {Promise<Object>} Resultado do processamento
   * @private
   */
  async _processNewMessage(data) {
    try {
      const { info } = data;
      
      if (!info || !info.key) {
        return { success: false, message: 'Dados da mensagem inválidos' };
      }

      // Extrair informações da mensagem
      const {
        key: { remoteJid, id },
        message,
        pushName,
        messageTimestamp
      } = info;

      // Verificar se é uma mensagem válida
      if (!message || !remoteJid) {
        return { success: false, message: 'Mensagem inválida' };
      }

      // Processar contato
      const phoneNumber = remoteJid.split('@')[0];
      await this._updateContact(phoneNumber, pushName);

      // Notificar sobre nova mensagem
      await this.notificationService.createNotification(
        'newMessage',
        'Nova Mensagem Recebida',
        `Mensagem recebida de ${pushName || phoneNumber}`,
        {
          messageId: id,
          sender: phoneNumber,
          timestamp: messageTimestamp
        }
      );

      return {
        success: true,
        message: 'Nova mensagem processada',
        data: {
          messageId: id,
          sender: phoneNumber,
          timestamp: messageTimestamp
        }
      };
    } catch (error) {
      console.error('Erro ao processar nova mensagem:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa atualizações de presença
   * @param {Object} data - Dados do webhook
   * @returns {Promise<Object>} Resultado do processamento
   * @private
   */
  async _processPresenceUpdate(data) {
    try {
      const { info } = data;
      
      if (!info || !info.id) {
        return { success: false, message: 'Dados de presença inválidos' };
      }

      const phoneNumber = info.id.split('@')[0];
      const presence = info.presence || 'unavailable';

      // Atualizar contato com status de presença
      await Contact.findOneAndUpdate(
        { phoneNumber },
        { 
          $set: { 
            presence,
            lastSeen: presence === 'unavailable' ? new Date() : null
          }
        },
        { upsert: true }
      );

      return {
        success: true,
        message: 'Status de presença atualizado',
        data: { phoneNumber, presence }
      };
    } catch (error) {
      console.error('Erro ao processar atualização de presença:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa atualizações de chat
   * @param {Object} data - Dados do webhook
   * @returns {Promise<Object>} Resultado do processamento
   * @private
   */
  async _processChatUpdate(data) {
    try {
      const { info } = data;
      
      if (!info || !info.id) {
        return { success: false, message: 'Dados do chat inválidos' };
      }

      // Aqui você pode implementar lógica específica para chats
      // Por exemplo, atualizar um modelo de Chat no banco de dados

      return {
        success: true,
        message: 'Chat atualizado',
        data: { chatId: info.id }
      };
    } catch (error) {
      console.error('Erro ao processar atualização de chat:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa atualizações de participantes do grupo
   * @param {Object} data - Dados do webhook
   * @returns {Promise<Object>} Resultado do processamento
   * @private
   */
  async _processGroupParticipantsUpdate(data) {
    try {
      const { info } = data;
      
      if (!info || !info.id || !info.participants) {
        return { success: false, message: 'Dados de participantes inválidos' };
      }

      const { id: groupId, participants, action } = info;

      // Notificar sobre mudança no grupo
      await this.notificationService.createNotification(
        'groupUpdate',
        'Atualização de Grupo',
        `Participante ${action} no grupo ${groupId}`,
        {
          groupId,
          action,
          participants
        }
      );

      return {
        success: true,
        message: 'Participantes do grupo atualizados',
        data: { groupId, action, participants }
      };
    } catch (error) {
      console.error('Erro ao processar atualização de participantes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa eventos de confirmação de mensagem (ACK)
   * @param {Object} data - Dados do webhook
   * @returns {Promise<Object>} Resultado do processamento
   * @private
   */
  async _processMessageAck(data) {
    try {
      const { info } = data;
      
      if (!info || !info.id) {
        return { success: false, message: 'ID da mensagem não encontrado' };
      }
      
      // Buscar registro de status da mensagem
      const messageStatus = await MessageStatus.findOne({
        evolutionApiMessageId: info.id
      });
      
      if (!messageStatus) {
        return { success: false, message: 'Status de mensagem não encontrado' };
      }
      
      // Mapear status do ACK para nosso sistema
      let newStatus;
      switch (info.ack) {
        case 1: // Enviado
          newStatus = 'sent';
          break;
        case 2: // Recebido pelo destinatário
          newStatus = 'delivered';
          break;
        case 3: // Lido pelo destinatário
          newStatus = 'read';
          break;
        default:
          newStatus = messageStatus.status; // Mantém o status atual
      }
      
      // Atualizar apenas se o status for "maior" que o atual
      // (lido > entregue > enviado > pendente)
      const statusPriority = {
        'pending': 0,
        'sent': 1,
        'delivered': 2,
        'read': 3,
        'failed': -1
      };
      
      if (statusPriority[newStatus] > statusPriority[messageStatus.status]) {
        // Atualizar campos baseados no novo status
        const updateData = { status: newStatus };
        
        if (newStatus === 'delivered') {
          updateData.deliveredAt = new Date();
        } else if (newStatus === 'read') {
          updateData.readAt = new Date();
        }
        
        // Atualizar o registro de status
        await MessageStatus.findByIdAndUpdate(messageStatus._id, updateData);
        
        // Atualizar estatísticas da campanha
        const campaignUpdate = {};
        
        if (newStatus === 'delivered') {
          campaignUpdate.$inc = { 'statistics.delivered': 1 };
        } else if (newStatus === 'read') {
          campaignUpdate.$inc = { 'statistics.read': 1 };
        }
        
        if (Object.keys(campaignUpdate).length > 0) {
          await Campaign.findByIdAndUpdate(messageStatus.campaign, campaignUpdate);
        }
        
        return {
          success: true,
          message: `Status da mensagem atualizado para ${newStatus}`,
          messageId: info.id
        };
      }
      
      return {
        success: true,
        message: 'Nenhuma atualização necessária',
        messageId: info.id
      };
    } catch (error) {
      console.error('Erro ao processar ACK de mensagem:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa eventos de status de mensagem
   * @param {Object} data - Dados do webhook
   * @returns {Promise<Object>} Resultado do processamento
   * @private
   */
  async _processMessageStatus(data) {
    try {
      const { info } = data;
      
      // Alguns eventos de status não têm relação direta com nossas mensagens
      // Este método pode ser expandido conforme necessidade
      
      return {
        success: true,
        message: 'Status de mensagem recebido',
        info
      };
    } catch (error) {
      console.error('Erro ao processar status de mensagem:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WebhookService(); 