const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// Proteger todas as rotas
router.use(protect);

// Rotas do dashboard
router.get('/stats', dashboardController.getStats);
router.get('/message-stats', dashboardController.getMessageStats);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;