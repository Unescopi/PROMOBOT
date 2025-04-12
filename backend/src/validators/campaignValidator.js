const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../middleware/validator');

/**
 * Validador para criar/atualizar campanha
 */
exports.campaignValidator = [
  body('name')
    .notEmpty()
    .withMessage('O nome é obrigatório')
    .isString()
    .withMessage('O nome deve ser uma string')
    .isLength({ max: 100 })
    .withMessage('O nome deve ter no máximo 100 caracteres'),
    
  body('description')
    .optional()
    .isString()
    .withMessage('A descrição deve ser uma string'),
    
  body('message')
    .notEmpty()
    .withMessage('A mensagem é obrigatória')
    .custom(isValidObjectId)
    .withMessage('ID de mensagem inválido'),
    
  body('contacts')
    .isArray()
    .withMessage('Contatos devem ser um array')
    .bail()
    .custom((value) => {
      if (value.length === 0) {
        throw new Error('É necessário fornecer pelo menos um contato');
      }
      
      const invalidIds = value.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        throw new Error(`IDs de contato inválidos: ${invalidIds.join(', ')}`);
      }
      
      return true;
    }),
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags devem ser um array'),
    
  body('tags.*')
    .optional()
    .isString()
    .withMessage('Cada tag deve ser uma string')
    .trim()
    .notEmpty()
    .withMessage('Tags não podem ser strings vazias'),
    
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Data de agendamento inválida')
    .bail()
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('A data de agendamento não pode ser no passado');
      }
      return true;
    }),
    
  // Validações para recorrência
  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring deve ser um valor booleano'),
    
  body('recurringType')
    .optional()
    .isIn([null, 'daily', 'weekly', 'monthly'])
    .withMessage('Tipo de recorrência inválido. Deve ser: daily, weekly ou monthly'),

  // Validações condicionais para recorrência
  body()
    .custom((body) => {
      if (body.isRecurring === true && !body.recurringType) {
        throw new Error('recurringType é obrigatório quando isRecurring é true');
      }
      
      if (body.recurringType === 'weekly' && (!body.recurringDays || body.recurringDays.length === 0)) {
        throw new Error('recurringDays é obrigatório para recorrência semanal');
      }
      
      if (body.recurringType === 'monthly' && (!body.recurringDays || body.recurringDays.length === 0)) {
        throw new Error('recurringDays é obrigatório para recorrência mensal');
      }
      
      return true;
    }),
    
  body('recurringDays')
    .optional()
    .isArray()
    .withMessage('recurringDays deve ser um array')
    .bail()
    .custom((value, { req }) => {
      if (req.body.recurringType === 'weekly') {
        // Verificar se todos os dias da semana são válidos (0-6, domingo a sábado)
        const invalidDays = value.filter(day => day < 0 || day > 6 || !Number.isInteger(day));
        if (invalidDays.length > 0) {
          throw new Error('Dias da semana inválidos. Devem ser números de 0 a 6');
        }
      } else if (req.body.recurringType === 'monthly') {
        // Verificar se todos os dias do mês são válidos (1-31)
        const invalidDays = value.filter(day => day < 1 || day > 31 || !Number.isInteger(day));
        if (invalidDays.length > 0) {
          throw new Error('Dias do mês inválidos. Devem ser números de 1 a 31');
        }
      }
      return true;
    }),
    
  body('recurringHour')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Hora de recorrência deve ser um número entre 0 e 23'),
    
  body('recurringMinute')
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage('Minuto de recorrência deve ser um número entre 0 e 59'),
    
  body('recurringStartDate')
    .optional()
    .isISO8601()
    .withMessage('Data de início de recorrência inválida'),
    
  body('recurringEndDate')
    .optional()
    .isISO8601()
    .withMessage('Data de fim de recorrência inválida')
    .bail()
    .custom((value, { req }) => {
      if (req.body.recurringStartDate && new Date(value) <= new Date(req.body.recurringStartDate)) {
        throw new Error('A data de fim deve ser posterior à data de início');
      }
      return true;
    }),
    
  body('allowedTimeStart')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Hora de início permitida deve ser um número entre 0 e 23'),
    
  body('allowedTimeEnd')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Hora de fim permitida deve ser um número entre 0 e 23')
    .bail()
    .custom((value, { req }) => {
      if (req.body.allowedTimeStart !== undefined && value <= req.body.allowedTimeStart) {
        throw new Error('A hora de fim deve ser maior que a hora de início');
      }
      return true;
    }),
    
  body('allowedDaysOfWeek')
    .optional()
    .isArray()
    .withMessage('allowedDaysOfWeek deve ser um array')
    .bail()
    .custom((value) => {
      // Verificar se todos os dias da semana são válidos (0-6, domingo a sábado)
      const invalidDays = value.filter(day => day < 0 || day > 6 || !Number.isInteger(day));
      if (invalidDays.length > 0) {
        throw new Error('Dias da semana inválidos. Devem ser números de 0 a 6');
      }
      return true;
    })
];

/**
 * Validador para parâmetro ID de campanha
 */
exports.campaignIdValidator = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('ID de campanha inválido')
];

/**
 * Validador para consulta de campanhas
 */
exports.campaignQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número inteiro entre 1 e 100'),
    
  query('status')
    .optional()
    .isIn(['draft', 'scheduled', 'sending', 'completed', 'paused', 'canceled'])
    .withMessage('Status inválido'),
    
  query('tag')
    .optional()
    .isString()
    .withMessage('Tag deve ser uma string'),
    
  query('search')
    .optional()
    .isString()
    .withMessage('Termo de busca deve ser uma string'),
    
  query('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring deve ser um valor booleano'),
    
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'scheduledDate', 'status'])
    .withMessage('Ordenação deve ser por: name, createdAt, scheduledDate ou status'),
    
  query('direction')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Direção deve ser: asc ou desc')
]; 