const { body } = require('express-validator');

/**
 * Validador para registro de novo usuário
 */
exports.registerValidator = [
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
    .withMessage('A senha deve conter pelo menos um número, uma letra minúscula e uma maiúscula')
];

/**
 * Validador para login de usuário
 */
exports.loginValidator = [
  body('email')
    .notEmpty()
    .withMessage('O email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('A senha é obrigatória')
];

/**
 * Validador para redefinição de senha
 */
exports.forgotPasswordValidator = [
  body('email')
    .notEmpty()
    .withMessage('O email é obrigatório')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
];

/**
 * Validador para configuração de nova senha
 */
exports.resetPasswordValidator = [
  body('token')
    .notEmpty()
    .withMessage('O token de redefinição é obrigatório'),

  body('password')
    .notEmpty()
    .withMessage('A nova senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
    .withMessage('A senha deve conter pelo menos um número, uma letra minúscula e uma maiúscula')
];

/**
 * Validador para alterar senha
 */
exports.changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('A senha atual é obrigatória'),

  body('newPassword')
    .notEmpty()
    .withMessage('A nova senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('A senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
    .withMessage('A senha deve conter pelo menos um número, uma letra minúscula e uma maiúscula')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('A nova senha deve ser diferente da senha atual');
      }
      return true;
    })
]; 