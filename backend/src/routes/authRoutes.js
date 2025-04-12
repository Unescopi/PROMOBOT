const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validator');
const { 
  loginValidator, 
  registerValidator, 
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator
} = require('../validators/authValidator');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Registrar um novo usuário
 * @access  Public
 */
router.post(
  '/register', 
  authLimiter,
  registerValidator, 
  validate,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuário e gerar token
 * @access  Public
 */
router.post(
  '/login', 
  authLimiter,
  loginValidator, 
  validate,
  authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Obter detalhes do usuário atual
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   PUT /api/auth/updatedetails
 * @desc    Atualizar informações do usuário
 * @access  Private
 */
router.put('/updatedetails', protect, authController.updateDetails);

/**
 * @route   PUT /api/auth/updatepassword
 * @desc    Atualizar senha
 * @access  Private
 */
router.put(
  '/updatepassword', 
  protect, 
  changePasswordValidator,
  validate,
  authController.updatePassword
);

/**
 * @route   POST /api/auth/forgotpassword
 * @desc    Recuperar senha - gerar token
 * @access  Public
 */
router.post(
  '/forgotpassword', 
  forgotPasswordValidator,
  validate,
  authController.forgotPassword
);

/**
 * @route   PUT /api/auth/resetpassword/:resettoken
 * @desc    Redefinir senha via token
 * @access  Public
 */
router.put(
  '/resetpassword/:resettoken', 
  resetPasswordValidator,
  validate,
  authController.resetPassword
);

/**
 * @route   GET /api/auth/logout
 * @desc    Fazer logout do usuário
 * @access  Private
 */
router.get('/logout', protect, authController.logout);

module.exports = router; 