const Log = require('../models/Log');

/**
 * Serviço para registrar e consultar logs de atividades
 */
class LogService {
  /**
   * Registrar uma atividade no sistema
   * @param {Object} logData - Dados do log
   * @param {string} logData.userId - ID do usuário que realizou a ação
   * @param {string} logData.action - Tipo de ação realizada
   * @param {string} logData.entity - Tipo de entidade afetada
   * @param {string} logData.entityId - ID da entidade afetada (opcional)
   * @param {string} logData.description - Descrição da ação
   * @param {string} logData.ip - Endereço IP do usuário (opcional)
   * @param {string} logData.userAgent - User-Agent do navegador (opcional)
   * @param {Object} logData.metadata - Dados adicionais (opcional)
   * @returns {Promise<Object>} - O log criado
   */
  static async createLog(logData) {
    try {
      const log = await Log.create({
        user: logData.userId,
        action: logData.action,
        entity: logData.entity || 'system',
        entityId: logData.entityId || null,
        description: logData.description,
        ip: logData.ip,
        userAgent: logData.userAgent,
        metadata: logData.metadata || {}
      });

      return log;
    } catch (error) {
      console.error('Erro ao registrar log:', error);
      // Não lançamos o erro para não interromper o fluxo da aplicação
      // em caso de falha no registro de logs
      return null;
    }
  }

  /**
   * Obter logs filtrados com paginação
   * @param {Object} filter - Filtros a aplicar na consulta
   * @param {Object} options - Opções de paginação e ordenação
   * @returns {Promise<Object>} - Logs filtrados e informações de paginação
   */
  static async getLogs(filter = {}, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 25;
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };

    try {
      const logs = await Log.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email role');

      const total = await Log.countDocuments(filter);

      return {
        logs,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      };
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      throw error;
    }
  }

  /**
   * Obter logs de um usuário específico
   * @param {string} userId - ID do usuário
   * @param {Object} options - Opções de paginação e ordenação
   * @returns {Promise<Object>} - Logs do usuário e informações de paginação
   */
  static async getUserLogs(userId, options = {}) {
    return this.getLogs({ user: userId }, options);
  }

  /**
   * Obter logs de uma entidade específica
   * @param {string} entityId - ID da entidade
   * @param {string} entityType - Tipo da entidade
   * @param {Object} options - Opções de paginação e ordenação
   * @returns {Promise<Object>} - Logs da entidade e informações de paginação
   */
  static async getEntityLogs(entityId, entityType, options = {}) {
    return this.getLogs({ 
      entityId: entityId,
      entity: entityType
    }, options);
  }

  /**
   * Obter logs de uma ação específica
   * @param {string} action - Tipo de ação
   * @param {Object} options - Opções de paginação e ordenação
   * @returns {Promise<Object>} - Logs da ação e informações de paginação
   */
  static async getActionLogs(action, options = {}) {
    return this.getLogs({ action }, options);
  }

  /**
   * Obter logs com filtros avançados
   * @param {Object} advancedFilter - Filtros avançados
   * @param {Object} options - Opções de paginação e ordenação
   * @returns {Promise<Object>} - Logs filtrados e informações de paginação
   */
  static async getLogsWithAdvancedFilter(advancedFilter, options = {}) {
    // Constrói um filtro MongoDB a partir dos filtros avançados
    const filter = {};

    // Filtrar por período
    if (advancedFilter.startDate || advancedFilter.endDate) {
      filter.createdAt = {};
      if (advancedFilter.startDate) {
        filter.createdAt.$gte = new Date(advancedFilter.startDate);
      }
      if (advancedFilter.endDate) {
        filter.createdAt.$lte = new Date(advancedFilter.endDate);
      }
    }

    // Filtrar por usuário
    if (advancedFilter.userId) {
      filter.user = advancedFilter.userId;
    }

    // Filtrar por ações
    if (advancedFilter.actions && advancedFilter.actions.length > 0) {
      filter.action = { $in: advancedFilter.actions };
    }

    // Filtrar por entidades
    if (advancedFilter.entities && advancedFilter.entities.length > 0) {
      filter.entity = { $in: advancedFilter.entities };
    }

    // Filtrar por ID de entidade
    if (advancedFilter.entityId) {
      filter.entityId = advancedFilter.entityId;
    }

    // Filtrar por descrição (pesquisa de texto)
    if (advancedFilter.searchTerm) {
      filter.description = { $regex: advancedFilter.searchTerm, $options: 'i' };
    }

    return this.getLogs(filter, options);
  }
}

module.exports = LogService; 