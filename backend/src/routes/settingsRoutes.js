const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotas protegidas que requerem autenticação
router.use(authMiddleware);

// Obter configurações
router.get('/', settingsController.getSettings);

// Atualizar configurações
router.put('/', settingsController.updateSettings);

module.exports = router; 