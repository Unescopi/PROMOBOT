const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../middleware/validator');

/**
 * Validador para criar/atualizar mensagem
 */
exports.messageValidator = [
  body('title')
    .notEmpty()
    .withMessage('O título é obrigatório')
    .isString()
    .withMessage('O título deve ser uma string')
    .isLength({ max: 100 })
    .withMessage('O título deve ter no máximo 100 caracteres'),
    
  body('content')
    .notEmpty()
    .withMessage('O conteúdo é obrigatório')
    .isString()
    .withMessage('O conteúdo deve ser uma string'),
    
  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'document', 'audio'])
    .withMessage('Tipo inválido. Deve ser: text, image, video, document ou audio'),
    
  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('URL de mídia inválida'),
    
  body('mediaType')
    .optional()
    .isIn(['image', 'video', 'document', 'audio'])
    .withMessage('Tipo de mídia inválido. Deve ser: image, video, document ou audio'),
    
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
    
  // Validação condicional para mídia
  body()
    .custom((body) => {
      if (body.mediaType && !body.mediaUrl) {
        throw new Error('mediaUrl é obrigatório quando mediaType é fornecido');
      }
      if (body.mediaUrl && !body.mediaType) {
        throw new Error('mediaType é obrigatório quando mediaUrl é fornecido');
      }
      return true;
    })
];

/**
 * Validador para parâmetro ID de mensagem
 */
exports.messageIdValidator = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('ID de mensagem inválido')
];

/**
 * Validador para consulta de mensagens
 */
exports.messageQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número inteiro entre 1 e 100'),
    
  query('tag')
    .optional()
    .isString()
    .withMessage('Tag deve ser uma string'),
    
  query('type')
    .optional()
    .isIn(['text', 'image', 'video', 'document', 'audio'])
    .withMessage('Tipo inválido. Deve ser: text, image, video, document ou audio'),
    
  query('search')
    .optional()
    .isString()
    .withMessage('Termo de busca deve ser uma string'),
    
  query('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'updatedAt'])
    .withMessage('Ordenação deve ser por: title, createdAt ou updatedAt'),
    
  query('direction')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Direção deve ser: asc ou desc')
]; 