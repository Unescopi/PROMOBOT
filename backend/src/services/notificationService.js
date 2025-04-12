const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Cria uma nova notificação
   * @param {string} type - Tipo da notificação
   * @param {string} title - Título da notificação
   * @param {string} message - Mensagem da notificação
   * @param {Object} [data] - Dados adicionais da notificação
   * @returns {Promise<Object>} Notificação criada
   */
  async createNotification(type, title, message, data = {}) {
    try {
      const notification = new Notification({
        type,
        title,
        message,
        data
      });

      await notification.save();
      logger.info(`Notificação criada: ${type} - ${title}`);
      return notification;
    } catch (error) {
      logger.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Marca uma notificação como lida
   * @param {string} notificationId - ID da notificação
   * @returns {Promise<Object>} Notificação atualizada
   */
  async markAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { read: true },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      return notification;
    } catch (error) {
      logger.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  /**
   * Marca todas as notificações como lidas
   * @returns {Promise<Object>} Resultado da operação
   */
  async markAllAsRead() {
    try {
      await Notification.updateMany(
        { read: false },
        { read: true }
      );
      logger.info('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      logger.error('Erro ao marcar todas as notificações como lidas:', error);
      throw error;
    }
  }

  /**
   * Busca notificações não lidas
   * @param {Object} [options] - Opções para a busca
   * @param {number} [options.limit=50] - Limite de resultados
   * @param {number} [options.skip=0] - Deslocamento dos resultados
   * @param {string} [options.type] - Tipo de notificação
   * @param {boolean} [options.read] - Status de leitura da notificação
   * @returns {Promise<Array>} Lista de notificações
   */
  async getNotifications(query = {}) {
    try {
      const { limit = 50, skip = 0, type, read } = query;
      const filter = {};
      
      if (type) filter.type = type;
      if (read !== undefined) filter.read = read === 'true';

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit));

      const total = await Notification.countDocuments(filter);

      return {
        notifications,
        total,
        hasMore: total > skip + notifications.length
      };
    } catch (error) {
      logger.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  /**
   * Deleta uma notificação
   * @param {string} notificationId - ID da notificação
   * @returns {Promise<Object>} Notificação deletada
   */
  async deleteNotification(notificationId) {
    try {
      const notification = await Notification.findByIdAndDelete(notificationId);
      
      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      logger.info(`Notificação deletada: ${notification.type} - ${notification.title}`);
      return notification;
    } catch (error) {
      logger.error('Erro ao deletar notificação:', error);
      throw error;
    }
  }

  /**
   * Limpa todas as notificações
   * @returns {Promise<Object>} Resultado da operação
   */
  async clearAllNotifications() {
    try {
      await Notification.deleteMany({});
      logger.info('Todas as notificações foram deletadas');
    } catch (error) {
      logger.error('Erro ao limpar todas as notificações:', error);
      throw error;
    }
  }

  // Métodos específicos para cada tipo de notificação
  async createPresenceUpdateNotification(contact, presence) {
    return this.createNotification(
      'presenceUpdate',
      'Atualização de Presença',
      `O contato ${contact.name || contact.phoneNumber} está ${presence}`,
      { contact, presence }
    );
  }

  async createChatUpdateNotification(chat) {
    return this.createNotification(
      'chatUpdate',
      'Atualização de Chat',
      `Chat atualizado: ${chat.name || chat.id}`,
      { chat }
    );
  }

  async createGroupParticipantsNotification(group, action, participants) {
    return this.createNotification(
      'groupParticipants',
      'Atualização de Participantes',
      `Grupo ${group.name}: ${action} - ${participants.length} participantes`,
      { group, action, participants }
    );
  }

  async handlePresenceUpdate(data) {
    try {
      const notification = await this.createNotification({
        type: 'presence',
        title: 'Atualização de Presença',
        message: `Usuário ${data.user} está ${data.status}`,
        data: data
      });
      return notification;
    } catch (error) {
      logger.error('Erro ao processar atualização de presença:', error);
      throw error;
    }
  }

  async handleChatUpdate(data) {
    try {
      const notification = await this.createNotification({
        type: 'chat',
        title: 'Atualização de Chat',
        message: `Chat ${data.chatId} foi atualizado`,
        data: data
      });
      return notification;
    } catch (error) {
      logger.error('Erro ao processar atualização de chat:', error);
      throw error;
    }
  }

  async handleGroupParticipantsUpdate(data) {
    try {
      const notification = await this.createNotification({
        type: 'group',
        title: 'Atualização de Grupo',
        message: `Participantes do grupo ${data.groupId} foram atualizados`,
        data: data
      });
      return notification;
    } catch (error) {
      logger.error('Erro ao processar atualização de participantes do grupo:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService(); 