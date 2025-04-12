const LogService = require('../services/logService');

/**
 * Middleware para registrar logs de atividades automaticamente
 * @param {string} action - Tipo de ação realizada
 * @param {string} entity - Tipo de entidade afetada
 * @param {Function} descriptionGenerator - Função para gerar a descrição do log (opcional)
 * @param {Function} metadataGenerator - Função para gerar os metadados do log (opcional)
 * @param {Function} entityIdGenerator - Função para extrair o ID da entidade (opcional)
 */
exports.logActivity = (
  action, 
  entity, 
  descriptionGenerator = null,
  metadataGenerator = null,
  entityIdGenerator = null
) => {
  return async (req, res, next) => {
    // Armazenar a função original de envio para interceptar a resposta
    const originalSend = res.send;

    // Substituir a função de envio para capturar a resposta
    res.send = function(body) {
      // Restaurar a função original de envio
      res.send = originalSend;

      // Continuar com o fluxo normal, enviando a resposta
      res.send(body);

      // Registrar o log apenas se a requisição foi bem-sucedida (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          // Determinar a descrição do log
          const description = descriptionGenerator 
            ? descriptionGenerator(req, res, body) 
            : `${req.user.name} realizou a ação ${action} em ${entity}`;

          // Determinar os metadados do log
          const metadata = metadataGenerator 
            ? metadataGenerator(req, res, body) 
            : {};

          // Determinar o ID da entidade
          const entityId = entityIdGenerator 
            ? entityIdGenerator(req, res, body) 
            : (req.params.id || null);

          // Criar o log
          LogService.createLog({
            userId: req.user._id,
            action,
            entity,
            entityId,
            description,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            metadata
          });
        } catch (error) {
          console.error('Erro ao registrar log de atividade:', error);
        }
      }
    };

    next();
  };
};

/**
 * Registrar manualmente um log de atividade
 * @param {Object} req - Requisição Express
 * @param {string} action - Tipo de ação realizada
 * @param {string} entity - Tipo de entidade afetada
 * @param {string} description - Descrição da ação
 * @param {string} entityId - ID da entidade afetada (opcional)
 * @param {Object} metadata - Metadados adicionais (opcional)
 */
exports.createLog = async (req, action, entity, description, entityId = null, metadata = {}) => {
  if (!req.user) return;

  try {
    await LogService.createLog({
      userId: req.user._id,
      action,
      entity,
      entityId,
      description,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata
    });
  } catch (error) {
    console.error('Erro ao registrar log manual:', error);
  }
}; 