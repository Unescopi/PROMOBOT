const express = require('express');
const router = express.Router();
const evolutionApiController = require('../controllers/evolutionApiController');
const evolutionApiService = require('../services/evolutionApiService');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { 
  sendTextMessageValidator,
  sendMediaMessageValidator
} = require('../validators/evolutionApiValidator');

// Rotas para interagir diretamente com a Evolution API
router.get('/status', protect, evolutionApiController.checkConnectionStatus);
router.get('/qrcode', protect, evolutionApiController.getQrCode);
router.post('/check-number', protect, evolutionApiController.checkNumber);
router.post('/send/text', protect, evolutionApiController.sendTextMessage);
router.post('/send/media', protect, evolutionApiController.sendMediaMessage);
router.post('/restart', protect, evolutionApiController.restartSession);
router.get('/metrics', protect, evolutionApiController.getMetrics);

/**
 * Rota para testar a conexão com a Evolution API
 * @route GET /api/evolution-api/test-connection
 */
router.get('/test-connection', protect, async (req, res) => {
  try {
    const result = await evolutionApiService.testConnection();
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao testar conexão com Evolution API:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao testar conexão com Evolution API', 
      error: error.message 
    });
  }
});

/**
 * Rota para executar testes de diagnóstico
 * @route POST /api/evolution-api/run-diagnostics
 */
router.post('/run-diagnostics', protect, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Número de telefone é obrigatório' 
      });
    }
    
    const result = await evolutionApiService.runDiagnosticTests(phoneNumber);
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao executar testes de diagnóstico:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao executar testes de diagnóstico', 
      error: error.message 
    });
  }
});

module.exports = router; 