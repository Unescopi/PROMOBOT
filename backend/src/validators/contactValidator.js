const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('../middleware/validator');

/**
 * Validador para criar/atualizar contato
 */
exports.contactValidator = [
  body('name')
    .notEmpty()
    .withMessage('O nome é obrigatório')
    .isString()
    .withMessage('O nome deve ser uma string')
    .isLength({ max: 100 })
    .withMessage('O nome deve ter no máximo 100 caracteres'),
    
  body('phoneNumber')
    .notEmpty()
    .withMessage('O número de telefone é obrigatório')
    .isString()
    .withMessage('O número de telefone deve ser uma string')
    .matches(/^\d{10,14}$/)
    .withMessage('O número de telefone deve conter entre 10 e 14 dígitos'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
    
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
    
  body('customFields')
    .optional()
    .isObject()
    .withMessage('customFields deve ser um objeto')
];

/**
 * Validador para parâmetro ID de contato
 */
exports.contactIdValidator = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('ID de contato inválido')
];

/**
 * Validador para consulta de contatos
 */
exports.contactQueryValidator = [
  query('page')
    .optional()
    .customSanitizer(value => value === undefined ? undefined : Number(value) || 1)
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
    
  query('limit')
    .optional()
    .customSanitizer(value => value === undefined ? undefined : Number(value) || 50)
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limite deve ser um número inteiro entre 1 e 1000'),
    
  query('tag')
    .optional()
    .isString()
    .withMessage('Tag deve ser uma string'),
    
  query('search')
    .optional()
    .isString()
    .withMessage('Termo de busca deve ser uma string'),
    
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt', 'phoneNumber', 'email', 'active'])
    .withMessage('Ordenação deve ser por: name, createdAt, updatedAt, phoneNumber, email ou active'),
    
  query('direction')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Direção deve ser: asc ou desc'),
    
  (req, res, next) => {
    const allowedParams = ['page', 'limit', 'tag', 'search', 'sortBy', 'direction', 'status'];
    Object.keys(req.query).forEach(key => {
      if (!allowedParams.includes(key)) {
        console.log(`Removendo parâmetro de consulta não validado: ${key}`);
        delete req.query[key];
      }
    });
    next();
  }
]; 