const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  createUserValidator,
  updateUserValidator,
  updateUserPasswordValidator
} = require('../validators/userValidator');
const { logActivity } = require('../middleware/logger');

// Middleware para checar se o usuário é admin
const admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem acessar este recurso'
    });
  }
  next();
};

// Rotas protegidas que requerem autenticação e privilégios de admin
router.use(protect);
router.use(admin);

/**
 * @route   GET /api/users
 * @desc    Obter todos os usuários
 * @access  Private/Admin
 */
router.get('/', userController.getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Obter um usuário específico
 * @access  Private/Admin
 */
router.get('/:id', userController.getUser);

/**
 * @route   POST /api/users
 * @desc    Criar um novo usuário
 * @access  Private/Admin
 */
router.post(
  '/', 
  createUserValidator,
  validate,
  logActivity('create_user', 'user'),
  userController.createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Atualizar um usuário
 * @access  Private/Admin
 */
router.put(
  '/:id', 
  updateUserValidator,
  validate,
  logActivity('update_user', 'user', 
    (req) => `Atualização dos dados do usuário ${req.params.id}`,
    null,
    (req) => req.params.id
  ),
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deletar um usuário
 * @access  Private/Admin
 */
router.delete(
  '/:id', 
  logActivity('delete_user', 'user',
    (req) => `Exclusão do usuário ${req.params.id}`,
    null,
    (req) => req.params.id
  ),
  userController.deleteUser
);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Atualizar senha de um usuário (admin)
 * @access  Private/Admin
 */
router.put(
  '/:id/password', 
  updateUserPasswordValidator,
  validate,
  logActivity('update_password', 'user',
    (req) => `Alteração de senha do usuário ${req.params.id}`,
    null,
    (req) => req.params.id
  ),
  userController.updateUserPassword
);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Atualizar status de um usuário
 * @access  Private/Admin
 */
router.put(
  '/:id/status',
  logActivity('update_user_status', 'user',
    (req) => `Alteração de status do usuário ${req.params.id} para ${req.body.status}`,
    (req) => ({ newStatus: req.body.status }),
    (req) => req.params.id
  ),
  userController.updateUserStatus
);

/**
 * @route   PUT /api/users/:id/permissions
 * @desc    Atualizar permissões de um usuário
 * @access  Private/Admin
 */
router.put(
  '/:id/permissions',
  logActivity('update_user_permissions', 'user',
    (req) => `Alteração de permissões do usuário ${req.params.id}`,
    null,
    (req) => req.params.id
  ),
  userController.updateUserPermissions
);

module.exports = router; 