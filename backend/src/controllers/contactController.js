const contactService = require('../services/contactService');

class ContactController {
  /**
   * Cria um novo contato
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async createContact(req, res) {
    try {
      const contact = await contactService.createContact(req.body);
      res.status(201).json(contact);
    } catch (error) {
      console.error('Erro no controlador de criação de contato:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao criar contato',
        error: error.message 
      });
    }
  }

  /**
   * Obtém todos os contatos
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getContacts(req, res) {
    try {
      // Log completo dos parâmetros recebidos
      console.log('Parâmetros recebidos na API de contatos:', req.query);
      
      // Extrair parâmetros com valores padrão
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const skip = (page - 1) * limit;
      
      // Passar todos os parâmetros de query para o serviço
      const result = await contactService.getContacts(req.query, limit, skip);
      
      // Garantir formato consistente da resposta
      res.json({
        success: true,
        ...result,
        page,
        limit,
        skip
      });
    } catch (error) {
      console.error('Erro no controlador de listagem de contatos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar contatos',
        error: error.message 
      });
    }
  }

  /**
   * Obtém um contato pelo ID
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getContactById(req, res) {
    try {
      const contact = await contactService.getContactById(req.params.id);
      
      if (!contact) {
        return res.status(404).json({ 
          success: false, 
          message: 'Contato não encontrado' 
        });
      }
      
      res.json(contact);
    } catch (error) {
      console.error('Erro no controlador de busca de contato:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar contato',
        error: error.message 
      });
    }
  }

  /**
   * Atualiza um contato existente
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async updateContact(req, res) {
    try {
      const contact = await contactService.updateContact(req.params.id, req.body);
      
      if (!contact) {
        return res.status(404).json({ 
          success: false, 
          message: 'Contato não encontrado' 
        });
      }
      
      res.json(contact);
    } catch (error) {
      console.error('Erro no controlador de atualização de contato:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar contato',
        error: error.message 
      });
    }
  }

  /**
   * Remove um contato
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async deleteContact(req, res) {
    try {
      const result = await contactService.deleteContact(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de remoção de contato:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao remover contato',
        error: error.message 
      });
    }
  }

  /**
   * Importa contatos de um arquivo CSV
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async importContactsFromCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo enviado' 
        });
      }
      
      const result = await contactService.importContactsFromCSV(req.file.buffer);
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de importação de contatos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao importar contatos',
        error: error.message 
      });
    }
  }
}

module.exports = new ContactController(); 