const segmentationService = require('../services/segmentationService');
const Contact = require('../models/Contact');
const Message = require('../models/Message');
const Campaign = require('../models/Campaign');
const MessageStatus = require('../models/MessageStatus');
const mongoose = require('mongoose');

class SegmentationController {
  /**
   * Realiza segmentação de contatos com base em critérios avançados
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async segmentContacts(req, res) {
    try {
      const { criteria } = req.body;
      
      if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'É necessário fornecer pelo menos um critério de segmentação' 
        });
      }

      // Usar o serviço para converter os critérios e segmentar os contatos
      const contacts = await segmentationService.segmentContacts(criteria);

      return res.status(200).json({
        success: true,
        count: contacts.length,
        data: contacts
      });
    } catch (error) {
      console.error('Erro ao segmentar contatos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao segmentar contatos',
        error: error.message
      });
    }
  }
  
  /**
   * Busca contatos que leram mensagens específicas
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async getContactsWhoReadMessages(req, res) {
    try {
      const { messageIds, campaignId, minReadCount, daysAgo } = req.body;
      
      // Preparar parâmetros para o serviço
      let targetMessageIds = [];
      
      // Se temos IDs específicos de mensagens
      if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
        targetMessageIds = messageIds;
      }
      
      // Se temos um ID de campanha, buscar todas as mensagens dessa campanha
      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        const campaignMessages = await Message.find(
          { campaignId: new mongoose.Types.ObjectId(campaignId) }
        ).select('_id').lean();
        
        if (campaignMessages.length > 0) {
          // Adicionar os IDs das mensagens ao array existente
          targetMessageIds = [
            ...targetMessageIds,
            ...campaignMessages.map(msg => msg._id.toString())
          ];
        }
      }
      
      // Calcular a data limite baseada no parâmetro daysAgo
      let afterDate = null;
      if (daysAgo && !isNaN(daysAgo)) {
        afterDate = new Date();
        afterDate.setDate(afterDate.getDate() - parseInt(daysAgo));
      }
      
      // Buscar os contatos que leram as mensagens
      const contacts = await segmentationService.getContactsWhoReadMessages(
        targetMessageIds,
        afterDate
      );
      
      // Filtrar por número mínimo de leituras se necessário
      let filteredContacts = contacts;
      if (minReadCount && !isNaN(minReadCount)) {
        const minCount = parseInt(minReadCount);
        // Implementar lógica de contagem e filtragem por minReadCount
        // Neste exemplo, assumimos que o serviço já fornece as contagens
      }
      
      return res.status(200).json({
        success: true,
        count: filteredContacts.length,
        data: filteredContacts
      });
    } catch (error) {
      console.error('Erro ao buscar contatos por leitura de mensagens:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar contatos por leitura de mensagens',
        error: error.message
      });
    }
  }
  
  /**
   * Cria uma nova lista de contatos (segmento) aplicando uma tag
   * @param {Object} req - Requisição Express
   * @param {Object} res - Resposta Express
   */
  async createContactSegment(req, res) {
    try {
      const { criteria, tags, segmentName, description } = req.body;
      
      if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'É necessário fornecer pelo menos um critério de segmentação' 
        });
      }
      
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'É necessário fornecer pelo menos uma tag para aplicar ao segmento' 
        });
      }
      
      // Aplicar as tags aos contatos que correspondem aos critérios
      const results = [];
      for (const tag of tags) {
        const result = await segmentationService.createContactSegment(tag, criteria);
        results.push(result);
      }
      
      // Calcular totais
      const totalUpdated = results.reduce((sum, result) => sum + result.count, 0);
      const totalMatched = results.length > 0 ? results[0].totalContacts : 0;
      
      return res.status(200).json({
        success: true,
        message: `Segmento "${segmentName || 'Personalizado'}" criado com sucesso`,
        matchedContacts: totalMatched,
        modifiedContacts: totalUpdated,
        segmentInfo: {
          name: segmentName,
          description: description,
          criteria: criteria,
          tags: tags,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Erro ao criar segmento de contatos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar segmento de contatos',
        error: error.message
      });
    }
  }
}

module.exports = new SegmentationController(); 