const messageService = require('../services/messageService');

class MessageController {
  /**
   * Cria uma nova mensagem
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async createMessage(req, res) {
    try {
      const message = await messageService.createMessage(req.body);
      res.status(201).json(message);
    } catch (error) {
      console.error('Erro no controlador de criação de mensagem:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao criar mensagem',
        error: error.message 
      });
    }
  }

  /**
   * Obtém todas as mensagens
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getMessages(req, res) {
    try {
      const messages = await messageService.getMessages(req.query);
      res.json(messages);
    } catch (error) {
      console.error('Erro no controlador de listagem de mensagens:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar mensagens',
        error: error.message 
      });
    }
  }

  /**
   * Obtém uma mensagem pelo ID
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getMessageById(req, res) {
    try {
      const message = await messageService.getMessageById(req.params.id);
      
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          message: 'Mensagem não encontrada' 
        });
      }
      
      res.json(message);
    } catch (error) {
      console.error('Erro no controlador de busca de mensagem:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar mensagem',
        error: error.message 
      });
    }
  }

  /**
   * Atualiza uma mensagem existente
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async updateMessage(req, res) {
    try {
      const message = await messageService.updateMessage(req.params.id, req.body);
      
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          message: 'Mensagem não encontrada' 
        });
      }
      
      res.json(message);
    } catch (error) {
      console.error('Erro no controlador de atualização de mensagem:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar mensagem',
        error: error.message 
      });
    }
  }

  /**
   * Remove uma mensagem
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async deleteMessage(req, res) {
    try {
      const result = await messageService.deleteMessage(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de remoção de mensagem:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao remover mensagem',
        error: error.message 
      });
    }
  }

  /**
   * Processa uma mensagem com variáveis personalizadas
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async processMessageTemplate(req, res) {
    try {
      const { id } = req.params;
      const { variables } = req.body;
      
      const message = await messageService.getMessageById(id);
      
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          message: 'Mensagem não encontrada' 
        });
      }
      
      const processedContent = messageService.processMessageTemplate(message, variables);
      
      res.json({
        success: true,
        original: message.content,
        processed: processedContent,
        messageId: message._id
      });
    } catch (error) {
      console.error('Erro no controlador de processamento de template:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar template',
        error: error.message 
      });
    }
  }
}

module.exports = new MessageController(); 