const evolutionApiService = require('../services/evolutionApiService');

class EvolutionApiController {
  /**
   * Verifica o status da conexão com o WhatsApp
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async checkConnectionStatus(req, res) {
    try {
      const status = await evolutionApiService.checkConnectionStatus();
      res.json(status);
    } catch (error) {
      console.error('Erro ao verificar status da conexão:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao verificar status da conexão',
        error: error.message 
      });
    }
  }

  /**
   * Envia uma mensagem de texto diretamente para um número
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async sendTextMessage(req, res) {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone e mensagem são obrigatórios'
        });
      }
      
      const result = await evolutionApiService.sendTextMessage(phoneNumber, message);
      res.json(result);
    } catch (error) {
      console.error('Erro ao enviar mensagem de texto:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao enviar mensagem',
        error: error.message 
      });
    }
  }

  /**
   * Envia uma mensagem com mídia diretamente para um número
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async sendMediaMessage(req, res) {
    try {
      const { 
        phone, phoneNumber, 
        message, caption,
        mediaUrl, mediaBase64, mediaMimeType, mediaType,
        evolutionPayload 
      } = req.body;
      
      // Campos obrigatórios
      const targetPhone = phone || phoneNumber;
      
      if (!targetPhone) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone é obrigatório'
        });
      }
      
      // Verificar se temos informações de mídia
      if (!mediaUrl && !mediaBase64 && !evolutionPayload) {
        return res.status(400).json({
          success: false,
          message: 'URL da mídia, base64 ou payload da Evolution são obrigatórios'
        });
      }
      
      let result;
      
      // Se temos payload específico da Evolution API, usá-lo diretamente
      if (evolutionPayload) {
        console.log('Usando payload específico da Evolution API');
        
        // Adicionar número de telefone ao payload se não estiver presente
        if (!evolutionPayload.number) {
          evolutionPayload.number = targetPhone;
        }
        
        // Usar novo método para envio direto com payload
        result = await evolutionApiService.sendMediaWithPayload(evolutionPayload);
      } else {
        // Usar o método sendMediaMessage existente
        const targetCaption = message || caption || '';
        const targetMediaUrl = mediaUrl || (mediaBase64 ? `data:${mediaMimeType};base64,${mediaBase64}` : null);
        const targetMediaType = mediaType || 'image';
        
        result = await evolutionApiService.sendMediaMessage(
          targetPhone,
          targetCaption,
          targetMediaUrl,
          targetMediaType
        );
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao enviar mensagem com mídia:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao enviar mensagem com mídia',
        error: error.message 
      });
    }
  }

  /**
   * Obtém o QR Code para autenticação do WhatsApp
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getQrCode(req, res) {
    try {
      const result = await evolutionApiService.getQrCode();
      res.json(result);
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao obter QR Code',
        error: error.message 
      });
    }
  }

  /**
   * Verifica se um número existe no WhatsApp
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async checkNumber(req, res) {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Número de telefone é obrigatório'
        });
      }
      
      const result = await evolutionApiService.checkNumber(phoneNumber);
      res.json(result);
    } catch (error) {
      console.error('Erro ao verificar número:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao verificar número',
        error: error.message 
      });
    }
  }

  /**
   * Reinicia a sessão do WhatsApp
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async restartSession(req, res) {
    try {
      const result = await evolutionApiService.restartSession();
      res.json(result);
    } catch (error) {
      console.error('Erro ao reiniciar sessão:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao reiniciar sessão',
        error: error.message 
      });
    }
  }

  /**
   * Obtém métricas de envio de mensagens
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getMetrics(req, res) {
    try {
      const result = await evolutionApiService.getMetrics();
      res.json(result);
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao obter métricas',
        error: error.message 
      });
    }
  }
}

module.exports = new EvolutionApiController(); 