const { body, check } = require('express-validator');
const { isValidObjectId } = require('../middleware/validator');

/**
 * Validações para a rota de segmentação de contatos
 */
exports.segmentContactsValidator = [
  body('criteria')
    .isArray({ min: 1 })
    .withMessage('É necessário fornecer pelo menos um critério de segmentação')
    .bail(),
  
  body('criteria.*.field')
    .notEmpty()
    .withMessage('O campo "field" é obrigatório em cada critério')
    .isString()
    .withMessage('O campo "field" deve ser uma string'),
  
  body('criteria.*.operator')
    .notEmpty()
    .withMessage('O campo "operator" é obrigatório em cada critério')
    .isString()
    .withMessage('O campo "operator" deve ser uma string')
    .isIn(['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'exists', 'in'])
    .withMessage('Operador inválido. Use: equals, contains, startsWith, endsWith, greaterThan, lessThan, exists, in'),
  
  body('criteria.*.value')
    .optional({ nullable: true })
];

/**
 * Validações para a rota de buscar contatos que leram mensagens
 */
exports.contactsWhoReadMessagesValidator = [
  body()
    .custom((body) => {
      if (!body.messageIds && !body.campaignId) {
        throw new Error('É necessário fornecer messageIds ou campaignId');
      }
      return true;
    }),
  
  body('messageIds')
    .optional()
    .isArray()
    .withMessage('messageIds deve ser um array')
    .bail()
    .custom((value) => {
      if (value && value.length > 0) {
        const invalidIds = value.filter(id => !isValidObjectId(id));
        if (invalidIds.length > 0) {
          throw new Error(`IDs de mensagem inválidos: ${invalidIds.join(', ')}`);
        }
      }
      return true;
    }),
  
  body('campaignId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('campaignId deve ser um ObjectId válido'),
  
  body('minReadCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minReadCount deve ser um número inteiro positivo'),
  
  body('daysAgo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('daysAgo deve ser um número inteiro positivo')
];

/**
 * Validações para a rota de criar segmento de contatos
 */
exports.createContactSegmentValidator = [
  body('criteria')
    .isArray({ min: 1 })
    .withMessage('É necessário fornecer pelo menos um critério de segmentação')
    .bail(),
  
  body('tags')
    .isArray({ min: 1 })
    .withMessage('É necessário fornecer pelo menos uma tag')
    .bail(),
  
  body('tags.*')
    .isString()
    .withMessage('Cada tag deve ser uma string')
    .trim()
    .notEmpty()
    .withMessage('Tags não podem ser strings vazias'),
  
  body('segmentName')
    .isString()
    .withMessage('O nome do segmento deve ser uma string')
    .trim()
    .notEmpty()
    .withMessage('O nome do segmento é obrigatório')
    .isLength({ max: 100 })
    .withMessage('O nome do segmento deve ter no máximo 100 caracteres'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('A descrição deve ser uma string')
    .isLength({ max: 500 })
    .withMessage('A descrição deve ter no máximo 500 caracteres')
]; 