const Settings = require('../models/Settings');
const LogService = require('./logService');

class SettingsService {
  /**
   * Obtém todas as configurações do sistema
   * @returns {Promise<Object>} Configurações
   */
  async getSettings() {
    try {
      const settings = await Settings.getSettings();
      return {
        success: true,
        data: settings
      };
    } catch (error) {
      console.error('Erro ao obter configurações:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualiza as configurações do sistema
   * @param {Object} settings - Novas configurações
   * @param {Object} user - Usuário que está fazendo a atualização
   * @returns {Promise<Object>} Configurações atualizadas
   */
  async updateSettings(settings, user) {
    try {
      // Validar permissões
      if (!user.permissions.settings.manage) {
        throw new Error('Usuário não tem permissão para gerenciar configurações');
      }

      // Obter configurações atuais
      const currentSettings = await Settings.getSettings();

      // Atualizar configurações
      const updatedSettings = await Settings.findOneAndUpdate(
        {},
        { $set: settings },
        { new: true, runValidators: true }
      );

      // Registrar log de alteração
      await LogService.createLog({
        userId: user._id,
        action: 'update_settings',
        entity: 'settings',
        entityId: updatedSettings._id,
        description: 'Configurações do sistema atualizadas',
        ip: user.lastIp,
        userAgent: user.lastUserAgent,
        metadata: {
          changes: this._getChangedFields(currentSettings, updatedSettings)
        }
      });

      return {
        success: true,
        data: updatedSettings,
        message: 'Configurações atualizadas com sucesso'
      };
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compara as configurações antigas com as novas para identificar mudanças
   * @private
   */
  _getChangedFields(oldSettings, newSettings) {
    const changes = {};
    
    // Comparar cada seção
    ['api', 'messages', 'notifications', 'system'].forEach(section => {
      if (JSON.stringify(oldSettings[section]) !== JSON.stringify(newSettings[section])) {
        changes[section] = {
          old: oldSettings[section],
          new: newSettings[section]
        };
      }
    });

    return changes;
  }
}

module.exports = new SettingsService(); 