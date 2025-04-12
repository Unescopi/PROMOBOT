const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { protect } = require('../middleware/auth');

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

// Todas as rotas exigem autenticação
router.use(protect);

// Rota para obter os logs do usuário atual (não precisa ser admin)
router.get('/me', logController.getMyLogs);

// Rotas de administração (requerem privilégios de admin)
router.use(admin);

// Rotas para gerenciar logs
router.get('/', logController.getLogs);
router.get('/user/:userId', logController.getUserLogs);
router.get('/action/:action', logController.getActionLogs);
router.get('/entity/:entityType/:entityId', logController.getEntityLogs);
router.get('/stats', logController.getActivityStats);

module.exports = router; 