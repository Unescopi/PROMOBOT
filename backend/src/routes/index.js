const express = require('express');
const router = express.Router();
const { 
  messagingLimiter, 
  evolutionApiLimiter 
} = require('../middleware/rateLimiter');

// Adicionar middleware de debug
router.use((req, res, next) => {
  console.log('Requisição recebida:', req.method, req.path);
  next();
});

// Importar todas as rotas
const contactRoutes = require('./contactRoutes');
const messageRoutes = require('./messageRoutes');
const campaignRoutes = require('./campaignRoutes');
const webhookRoutes = require('./webhookRoutes');
const evolutionApiRoutes = require('./evolutionApiRoutes');
const segmentationRoutes = require('./segmentationRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const logRoutes = require('./logRoutes');
const queueRoutes = require('./queueRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const settingsRoutes = require('./settingsRoutes');
const notificationRoutes = require('./notificationRoutes');

// Registrar as rotas com rate limiters específicos
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contacts', contactRoutes);
router.use('/messages', messagingLimiter, messageRoutes);
router.use('/campaigns', messagingLimiter, campaignRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/evolution-api', evolutionApiLimiter, evolutionApiRoutes);
router.use('/segmentation', segmentationRoutes);
router.use('/logs', logRoutes);
router.use('/queue', messagingLimiter, queueRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);

// Rota para verificar se a API está funcionando
router.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'API de Automação de Mensagens funcionando normalmente',
    version: '1.0.0'
  });
});

// Endpoint de health check para monitoramento (sem autenticação)
router.get('/health', (req, res) => {
  const mongoStatus = require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      mongodb: mongoStatus
    }
  });
});

module.exports = router; 