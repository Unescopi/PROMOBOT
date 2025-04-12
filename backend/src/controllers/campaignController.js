const campaignService = require('../services/campaignService');

class CampaignController {
  /**
   * Cria uma nova campanha
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async createCampaign(req, res) {
    try {
      console.log('[CampaignController] Iniciando criação de campanha');
      console.log('[CampaignController] Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      // Verificar campos obrigatórios antes de chamar o serviço
      if (!req.body.name) {
        return res.status(400).json({
          success: false,
          message: 'Erro de validação nos dados da requisição',
          error: 'O nome da campanha é obrigatório'
        });
      }
      
      if (!req.body.message) {
        return res.status(400).json({
          success: false,
          message: 'Erro de validação nos dados da requisição',
          error: 'É necessário selecionar uma mensagem'
        });
      }
      
      // Verificar se existe pelo menos uma forma de seleção de contatos
      if (!req.body.sendToAll && 
          (!req.body.contacts || req.body.contacts.length === 0) && 
          (!req.body.tags || req.body.tags.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Erro de validação nos dados da requisição',
          error: 'É necessário selecionar contatos específicos, tags ou ativar "enviar para todos"'
        });
      }
      
      // Verificar regras de agendamento - permitir envio imediato com sendNow=true
      if (!req.body.isRecurring && !req.body.scheduledDate && req.body.sendNow !== true) {
        console.error('[CampaignController] Erro de validação: Faltando configuração de agendamento ou envio imediato');
        return res.status(400).json({
          success: false,
          message: 'Erro de validação nos dados da requisição',
          error: 'É necessário definir uma data de agendamento, configurar recorrência ou ativar envio imediato'
        });
      }
      
      // Remover campos vazios ou indefinidos
      const cleanData = { ...req.body };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined || cleanData[key] === '' || cleanData[key] === null) {
          delete cleanData[key];
        }
      });
      
      // Se for envio imediato, garantir que o status está correto
      if (cleanData.sendNow === true) {
        console.log('[CampaignController] Campanha configurada para envio imediato');
        cleanData.status = 'draft';
        // Remover scheduledDate explicitamente para evitar conflitos
        delete cleanData.scheduledDate;
      }
      
      console.log('[CampaignController] Dados limpos:', JSON.stringify(cleanData, null, 2));
      
      const campaign = await campaignService.createCampaign(cleanData);
      console.log('[CampaignController] Campanha criada com sucesso:', campaign._id);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('[CampaignController] Erro no controlador de criação de campanha:', error);
      
      // Determinar o tipo de erro para retornar status e mensagem adequados
      if (error.name === 'ValidationError') {
        // Erros de validação do Mongoose
        const validationErrors = Object.values(error.errors).map(e => e.message).join(', ');
        return res.status(400).json({ 
          success: false, 
          message: 'Erro de validação nos dados da requisição',
          error: validationErrors
        });
      } else if (error.name === 'MongoServerError' && error.code === 11000) {
        // Erros de duplicidade (índice único)
        return res.status(400).json({
          success: false,
          message: 'Erro de validação nos dados da requisição',
          error: 'Já existe uma campanha com este nome'
        });
      } else {
        // Outros erros
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao criar campanha',
          error: error.message 
        });
      }
    }
  }

  /**
   * Obtém todas as campanhas
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getCampaigns(req, res) {
    try {
      const campaigns = await campaignService.getCampaigns(req.query);
      res.json(campaigns);
    } catch (error) {
      console.error('Erro no controlador de listagem de campanhas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao listar campanhas',
        error: error.message 
      });
    }
  }

  /**
   * Obtém uma campanha pelo ID
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getCampaignById(req, res) {
    try {
      const campaign = await campaignService.getCampaignById(req.params.id);
      
      if (!campaign) {
        return res.status(404).json({ 
          success: false, 
          message: 'Campanha não encontrada' 
        });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Erro no controlador de busca de campanha:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar campanha',
        error: error.message 
      });
    }
  }

  /**
   * Atualiza uma campanha existente
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async updateCampaign(req, res) {
    try {
      const campaign = await campaignService.updateCampaign(req.params.id, req.body);
      
      if (!campaign) {
        return res.status(404).json({ 
          success: false, 
          message: 'Campanha não encontrada' 
        });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Erro no controlador de atualização de campanha:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao atualizar campanha',
        error: error.message 
      });
    }
  }

  /**
   * Inicia o envio de uma campanha
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async startCampaign(req, res) {
    console.log(`[CampaignController] Iniciando campanha ${req.params.id}`);
    try {
      const result = await campaignService.startCampaign(req.params.id);
      console.log(`[CampaignController] Campanha iniciada com sucesso:`, result);
      
      // Formatar a resposta com base no tipo de operação realizada
      if (result.scheduled) {
        // Foi agendada para o futuro
        const scheduledDate = new Date(result.scheduledDate);
        const formattedDate = scheduledDate.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        res.json({
          success: true,
          message: `Campanha agendada com sucesso para ${formattedDate}`,
          scheduled: true,
          scheduledDate: result.scheduledDate,
          campaignId: result.campaignId
        });
      } else {
        // Foi iniciada imediatamente
        res.json({
          success: true,
          message: 'Campanha iniciada com sucesso',
          scheduled: false,
          campaignId: result.campaignId,
          queueStats: result.queueStats
        });
      }
    } catch (error) {
      console.error('[CampaignController] Erro no controlador de início de campanha:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao iniciar campanha',
        error: error.message 
      });
    }
  }

  /**
   * Pausa uma campanha em andamento
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async pauseCampaign(req, res) {
    try {
      const result = await campaignService.pauseCampaign(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de pausa de campanha:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao pausar campanha',
        error: error.message 
      });
    }
  }

  /**
   * Cancela uma campanha
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async cancelCampaign(req, res) {
    try {
      const result = await campaignService.cancelCampaign(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Erro no controlador de cancelamento de campanha:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao cancelar campanha',
        error: error.message 
      });
    }
  }

  /**
   * Obtém estatísticas de uma campanha
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getCampaignStatistics(req, res) {
    try {
      const statistics = await campaignService.getCampaignStatistics(req.params.id);
      res.json(statistics);
    } catch (error) {
      console.error('Erro no controlador de estatísticas de campanha:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao obter estatísticas da campanha',
        error: error.message 
      });
    }
  }
}

module.exports = new CampaignController(); 