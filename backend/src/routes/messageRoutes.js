const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  messageValidator,
  messageIdValidator,
  messageQueryValidator
} = require('../validators/messageValidator');
const { body } = require('express-validator');

// Rotas para mensagens
router.post('/', protect, messageValidator, validate, messageController.createMessage);
router.get('/', protect, messageQueryValidator, validate, messageController.getMessages);
router.get('/:id', protect, messageIdValidator, validate, messageController.getMessageById);
router.put('/:id', protect, messageIdValidator, messageValidator, validate, messageController.updateMessage);
router.delete('/:id', protect, messageIdValidator, validate, messageController.deleteMessage);

// Rota para processar template de mensagem
router.post(
  '/:id/process-template', 
  protect, 
  messageIdValidator,
  body('contactData').isObject().withMessage('Dados do contato devem ser um objeto'),
  validate,
  messageController.processMessageTemplate
);

module.exports = router; 