const settingsService = require('../services/settingsService');

class SettingsController {
  /**
   * Obtém todas as configurações do sistema
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getSettings(req, res) {
    try {
      const result = await settingsService.getSettings();
      
      if (!result.success) {
        return res.status(500).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de configurações:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao obter configurações',
        error: error.message 
      });
    }
  }

  /**
   * Atualiza as configurações do sistema
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async updateSettings(req, res) {
    try {
      const result = await settingsService.updateSettings(req.body, req.user);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de atualização de configurações:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar configurações',
        error: error.message 
      });
    }
  }
}

module.exports = new SettingsController(); 