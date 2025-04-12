const { body } = require('express-validator');

/**
 * Validador para envio de mensagem de texto
 */
exports.sendTextMessageValidator = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('O número de telefone é obrigatório')
    .isString()
    .withMessage('O número de telefone deve ser uma string')
    .matches(/^\d{10,14}$/)
    .withMessage('O número de telefone deve conter entre 10 e 14 dígitos'),
    
  body('message')
    .notEmpty()
    .withMessage('A mensagem é obrigatória')
    .isString()
    .withMessage('A mensagem deve ser uma string')
];

/**
 * Validador para envio de mensagem com mídia
 */
exports.sendMediaMessageValidator = [
  body('phoneNumber')
    .notEmpty()
    .withMessage('O número de telefone é obrigatório')
    .isString()
    .withMessage('O número de telefone deve ser uma string')
    .matches(/^\d{10,14}$/)
    .withMessage('O número de telefone deve conter entre 10 e 14 dígitos'),
    
  body('mediaUrl')
    .notEmpty()
    .withMessage('A URL da mídia é obrigatória')
    .isURL()
    .withMessage('URL de mídia inválida'),
    
  body('mediaType')
    .notEmpty()
    .withMessage('O tipo de mídia é obrigatório')
    .isIn(['image', 'video', 'document', 'audio'])
    .withMessage('Tipo de mídia inválido. Deve ser: image, video, document ou audio'),
    
  body('caption')
    .optional()
    .isString()
    .withMessage('A legenda deve ser uma string')
];