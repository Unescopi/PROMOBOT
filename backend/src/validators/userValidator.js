const { body } = require('express-validator');

/**
 * Validador para criação de usuário
 */
exports.createUserValidator = [
  body('name')
    .notEmpty()
    .withMessage('O nome é obrigatório')
    .isString()
    .withMessage('O nome deve ser uma string')
    .isLength({ min: 3, max: 50 })
    .withMessage('O nome deve ter entre 3 e 50 caracteres'),

  body('email')
    .notEmpty()
    .withMessage('O email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('A senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
    .withMessage('A senha deve conter pelo menos um número, uma letra minúscula e uma maiúscula'),

  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Função inválida. Deve ser user ou admin')
];

/**
 * Validador para atualização de usuário
 */
exports.updateUserValidator = [
  body('name')
    .optional()
    .isString()
    .withMessage('O nome deve ser uma string')
    .isLength({ min: 3, max: 50 })
    .withMessage('O nome deve ter entre 3 e 50 caracteres'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Função inválida. Deve ser user ou admin')
];

/**
 * Validador para atualização de senha de usuário
 */
exports.updateUserPasswordValidator = [
  body('password')
    .notEmpty()
    .withMessage('A senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
    .withMessage('A senha deve conter pelo menos um número, uma letra minúscula e uma maiúscula')
]; 