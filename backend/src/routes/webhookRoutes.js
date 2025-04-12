const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Rota para receber webhooks da Evolution API
router.post('/', webhookController.processWebhook);

module.exports = router; 