const queueService = require('../services/queueService');

class QueueController {
  /**
   * Obtém estatísticas da fila
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getQueueStats(req, res) {
    try {
      const stats = await queueService.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas da fila:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas da fila',
        error: error.message
      });
    }
  }
  
  /**
   * Pausa o processamento da fila
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async pauseQueue(req, res) {
    try {
      const result = await queueService.pauseQueue();
      res.json(result);
    } catch (error) {
      console.error('Erro ao pausar a fila:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao pausar a fila',
        error: error.message
      });
    }
  }
  
  /**
   * Retoma o processamento da fila
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async resumeQueue(req, res) {
    try {
      const result = await queueService.resumeQueue();
      res.json(result);
    } catch (error) {
      console.error('Erro ao retomar a fila:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao retomar a fila',
        error: error.message
      });
    }
  }
  
  /**
   * Limpa a fila (remove jobs pendentes)
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async clearQueue(req, res) {
    try {
      const { removeActive } = req.query;
      const result = await queueService.clearQueue(removeActive === 'true');
      res.json(result);
    } catch (error) {
      console.error('Erro ao limpar a fila:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao limpar a fila',
        error: error.message
      });
    }
  }
  
  /**
   * Envia uma mensagem de texto individual para um número
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async sendTextMessage(req, res) {
    try {
      const { phoneNumber, message, priority, delay } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone e mensagem são obrigatórios'
        });
      }
      
      const options = {
        priority: parseInt(priority) || 0,
        delay: parseInt(delay) || 0
      };
      
      const result = await queueService.addTextMessage(
        phoneNumber, 
        message,
        options
      );
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao enviar mensagem de texto:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem de texto',
        error: error.message
      });
    }
  }
  
  /**
   * Envia uma mensagem de mídia individual para um número
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async sendMediaMessage(req, res) {
    try {
      const { phoneNumber, mediaUrl, mediaType, caption, priority, delay } = req.body;
      
      if (!phoneNumber || !mediaUrl || !mediaType) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone, URL da mídia e tipo de mídia são obrigatórios'
        });
      }
      
      const options = {
        priority: parseInt(priority) || 0,
        delay: parseInt(delay) || 0
      };
      
      const result = await queueService.addMediaMessage(
        phoneNumber, 
        mediaUrl,
        mediaType,
        caption || '',
        options
      );
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao enviar mensagem de mídia:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem de mídia',
        error: error.message
      });
    }
  }
}

module.exports = new QueueController(); 