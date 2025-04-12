const Notification = require('../models/Notification');
const { validateObjectId } = require('../utils/validation');
const logger = require('../utils/logger');
const { handleError } = require('../utils/errorHandler');
const mongoose = require('mongoose');

class NotificationController {
  async getNotifications(req, res) {
    try {
      const notifications = await Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
      
      res.json(notifications);
    } catch (error) {
      handleError(res, error);
    }
  }

  async markAsRead(req, res) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { read: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ message: 'Notificação não encontrada' });
      }

      res.json(notification);
    } catch (error) {
      handleError(res, error);
    }
  }

  async markAllAsRead(req, res) {
    try {
      await Notification.updateMany(
        { userId: req.user._id, read: false },
        { read: true }
      );

      res.json({ message: 'Todas as notificações foram marcadas como lidas' });
    } catch (error) {
      handleError(res, error);
    }
  }

  async deleteNotification(req, res) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id
      });

      if (!notification) {
        return res.status(404).json({ message: 'Notificação não encontrada' });
      }

      res.json({ message: 'Notificação deletada com sucesso' });
    } catch (error) {
      handleError(res, error);
    }
  }

  async clearNotifications(req, res) {
    try {
      await Notification.deleteMany({ userId: req.user._id });
      res.json({ message: 'Todas as notificações foram removidas' });
    } catch (error) {
      handleError(res, error);
    }
  }

  // Novos endpoints para webhooks
  async handlePresenceUpdate(req, res) {
    try {
      const { phone, presence } = req.body;
      
      // Se vier de um webhook, não temos o req.user, então usamos o admin
      const userId = req.user?._id || await this._getAdminUserId();
      
      await Notification.create({
        userId,
        type: 'whatsapp',
        title: 'Atualização de Presença',
        message: `O número ${phone} está ${presence}`,
        data: { phone, presence }
      });

      res.json({ message: 'Notificação de presença registrada' });
    } catch (error) {
      logger.error('Erro ao processar atualização de presença:', error);
      res.status(500).json({ error: 'Erro ao processar atualização de presença' });
    }
  }

  async handleChatUpdate(req, res) {
    try {
      const { chatId, status } = req.body;
      
      // Se vier de um webhook, não temos o req.user, então usamos o admin
      const userId = req.user?._id || await this._getAdminUserId();
      
      await Notification.create({
        userId,
        type: 'whatsapp',
        title: 'Atualização de Chat',
        message: `Chat ${chatId} está ${status}`,
        data: { chatId, status }
      });

      res.json({ message: 'Notificação de chat registrada' });
    } catch (error) {
      logger.error('Erro ao processar atualização de chat:', error);
      res.status(500).json({ error: 'Erro ao processar atualização de chat' });
    }
  }

  async handleGroupParticipantUpdate(req, res) {
    try {
      const { groupId, participant, action } = req.body;
      
      // Se vier de um webhook, não temos o req.user, então usamos o admin
      const userId = req.user?._id || await this._getAdminUserId();
      
      await Notification.create({
        userId,
        type: 'whatsapp',
        title: 'Atualização de Grupo',
        message: `Participante ${participant} foi ${action} do grupo ${groupId}`,
        data: { groupId, participant, action }
      });

      res.json({ message: 'Notificação de grupo registrada' });
    } catch (error) {
      logger.error('Erro ao processar atualização de grupo:', error);
      res.status(500).json({ error: 'Erro ao processar atualização de grupo' });
    }
  }

  async createNotification(req, res) {
    try {
      const { type, title, message, data } = req.body;

      const notification = new Notification({
        userId: req.user._id,
        type,
        title,
        message,
        data
      });

      await notification.save();
      res.status(201).json(notification);
    } catch (error) {
      handleError(res, error);
    }
  }

  // Método auxiliar para obter o ID do usuário admin
  async _getAdminUserId() {
    try {
      // Importar aqui para evitar dependência circular
      const User = require('../models/User');
      
      // Buscar o primeiro usuário admin
      const adminUser = await User.findOne({ role: 'admin' });
      
      // Se não existir admin, retornar um ID genérico para o sistema
      return adminUser ? adminUser._id : new mongoose.Types.ObjectId('000000000000000000000000');
    } catch (error) {
      logger.error('Erro ao buscar usuário admin:', error);
      return new mongoose.Types.ObjectId('000000000000000000000000');
    }
  }
}

module.exports = new NotificationController(); 