const webhookService = require('../services/webhookService');

class WebhookController {
  /**
   * Processa webhooks da Evolution API
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async processWebhook(req, res) {
    try {
      // Verificações de segurança podem ser adicionadas aqui
      // Por exemplo, validar um token ou chave de API
      
      const result = await webhookService.processWebhook(req.body);
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de webhook:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar webhook',
        error: error.message 
      });
    }
  }
}

module.exports = new WebhookController(); 