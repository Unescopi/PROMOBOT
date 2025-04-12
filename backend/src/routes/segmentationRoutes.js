const express = require('express');
const router = express.Router();
const segmentationController = require('../controllers/segmentationController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  segmentContactsValidator,
  contactsWhoReadMessagesValidator,
  createContactSegmentValidator
} = require('../validators/segmentationValidator');

/**
 * @route   POST /api/segmentation/segment
 * @desc    Segmentar contatos com base em critérios
 * @access  Private
 */
router.post(
  '/segment', 
  protect, 
  segmentContactsValidator,
  validate,
  segmentationController.segmentContacts
);

/**
 * @route   POST /api/segmentation/read-stats
 * @desc    Obter contatos que leram determinadas mensagens
 * @access  Private
 */
router.post(
  '/read-stats', 
  protect, 
  contactsWhoReadMessagesValidator,
  validate,
  segmentationController.getContactsWhoReadMessages
);

/**
 * @route   POST /api/segmentation/create-segment
 * @desc    Criar um segmento de contatos aplicando tags
 * @access  Private
 */
router.post(
  '/create-segment', 
  protect, 
  createContactSegmentValidator,
  validate,
  segmentationController.createContactSegment
);

module.exports = router; 