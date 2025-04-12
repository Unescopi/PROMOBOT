const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Webhooks para atualizações do WhatsApp (sem autenticação)
router.post('/webhook/presence', notificationController.handlePresenceUpdate);
router.post('/webhook/chat', notificationController.handleChatUpdate);
router.post('/webhook/group-participants', notificationController.handleGroupParticipantUpdate);

// Aplicar middleware de autenticação nas rotas protegidas
router.use(authMiddleware);

// Rotas para notificações (com autenticação)
router.get('/', notificationController.getNotifications);
router.post('/', notificationController.createNotification);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.delete('/', notificationController.clearNotifications);

module.exports = router; 