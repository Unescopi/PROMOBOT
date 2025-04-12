const { body } = require('express-validator');

exports.settingsValidator = [
  // Validação das configurações da API
  body('api.apiKey')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('A chave da API é obrigatória'),
    
  body('api.baseUrl')
    .optional()
    .isURL()
    .withMessage('URL base inválida'),
    
  body('api.instanceName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Nome da instância é obrigatório'),
    
  body('api.webhookUrl')
    .optional()
    .isURL()
    .withMessage('URL do webhook inválida'),

  // Validação das configurações de mensagens
  body('messages.defaultDelay')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('O atraso deve estar entre 1 e 60 segundos'),
    
  body('messages.maxMessagesPerMinute')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('O limite de mensagens deve estar entre 1 e 100 por minuto'),
    
  body('messages.enableReadReceipts')
    .optional()
    .isBoolean()
    .withMessage('Valor inválido para confirmação de leitura'),
    
  body('messages.enableTypingIndicator')
    .optional()
    .isBoolean()
    .withMessage('Valor inválido para indicador de digitação'),

  // Validação das configurações de notificações
  body('notifications.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Valor inválido para notificações por email'),
    
  body('notifications.emailAddress')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
    
  body('notifications.notifyOnError')
    .optional()
    .isBoolean()
    .withMessage('Valor inválido para notificação de erros'),
    
  body('notifications.notifyOnCompletion')
    .optional()
    .isBoolean()
    .withMessage('Valor inválido para notificação de conclusão'),
    
  body('notifications.dailyReports')
    .optional()
    .isBoolean()
    .withMessage('Valor inválido para relatórios diários'),

  // Validação das configurações do sistema
  body('system.language')
    .optional()
    .isIn(['pt-BR', 'en-US', 'es'])
    .withMessage('Idioma não suportado'),
    
  body('system.timezone')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Fuso horário é obrigatório'),
    
  body('system.dateFormat')
    .optional()
    .isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
    .withMessage('Formato de data não suportado'),
    
  body('system.timeFormat')
    .optional()
    .isIn(['24h', '12h'])
    .withMessage('Formato de hora não suportado'),
    
  body('system.theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Tema não suportado')
]; 