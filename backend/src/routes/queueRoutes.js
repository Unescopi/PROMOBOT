const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  sendTextMessageValidator,
  sendMediaMessageValidator
} = require('../validators/evolutionApiValidator');

/**
 * @route   GET /api/queue/stats
 * @desc    Obter estatísticas da fila
 * @access  Private
 */
router.get('/stats', protect, queueController.getQueueStats);

/**
 * @route   POST /api/queue/pause
 * @desc    Pausar o processamento da fila
 * @access  Private
 */
router.post('/pause', protect, queueController.pauseQueue);

/**
 * @route   POST /api/queue/resume
 * @desc    Retomar o processamento da fila
 * @access  Private
 */
router.post('/resume', protect, queueController.resumeQueue);

/**
 * @route   DELETE /api/queue/clear
 * @desc    Limpar a fila (remover mensagens pendentes)
 * @access  Private
 */
router.delete('/clear', protect, queueController.clearQueue);

/**
 * @route   POST /api/queue/send/text
 * @desc    Enviar mensagem de texto para um único destinatário
 * @access  Private
 */
router.post(
  '/send/text', 
  protect, 
  sendTextMessageValidator, 
  validate, 
  queueController.sendTextMessage
);

/**
 * @route   POST /api/queue/send/media
 * @desc    Enviar mensagem com mídia para um único destinatário
 * @access  Private
 */
router.post(
  '/send/media', 
  protect, 
  sendMediaMessageValidator, 
  validate, 
  queueController.sendMediaMessage
);

module.exports = router; 