const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  campaignValidator,
  campaignIdValidator,
  campaignQueryValidator
} = require('../validators/campaignValidator');

// Rotas para campanhas
router.post('/', protect, campaignValidator, validate, campaignController.createCampaign);
router.get('/', protect, campaignQueryValidator, validate, campaignController.getCampaigns);
router.get('/:id', protect, campaignIdValidator, validate, campaignController.getCampaignById);
router.put('/:id', protect, campaignIdValidator, campaignValidator, validate, campaignController.updateCampaign);

// Rotas para gerenciar o estado da campanha
router.post('/:id/start', protect, campaignIdValidator, validate, campaignController.startCampaign);
router.post('/:id/pause', protect, campaignIdValidator, validate, campaignController.pauseCampaign);
router.post('/:id/cancel', protect, campaignIdValidator, validate, campaignController.cancelCampaign);

// Rota para obter estatísticas da campanha
router.get('/:id/statistics', protect, campaignIdValidator, validate, campaignController.getCampaignStatistics);

module.exports = router; 