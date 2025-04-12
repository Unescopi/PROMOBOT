const Contact = require('../models/Contact');
const MessageStatus = require('../models/MessageStatus');
const mongoose = require('mongoose');

class SegmentationService {
  /**
   * Converte o formato de critérios da API para o formato usado pelo serviço
   * @param {Array} apiCriteria - Critérios no formato da API
   * @returns {Object} Critérios no formato do serviço
   * @private
   */
  _convertCriteriaFormat(apiCriteria) {
    const serviceCriteria = {};
    
    // Processar cada critério da API
    apiCriteria.forEach(criterion => {
      const { field, operator, value } = criterion;
      
      if (!field || !operator) return;
      
      // Mapear operadores para o formato esperado pelo serviço
      switch (field) {
        case 'tags':
          if (operator === 'in' && Array.isArray(value)) {
            serviceCriteria.tags = value;
            serviceCriteria.tagOperator = 'OR';
          } else if (operator === 'all' && Array.isArray(value)) {
            serviceCriteria.tags = value;
            serviceCriteria.tagOperator = 'AND';
          }
          break;
          
        case 'name':
          if (operator === 'contains') {
            serviceCriteria.nameContains = value;
          }
          break;
          
        case 'email':
          if (operator === 'contains') {
            serviceCriteria.emailContains = value;
          }
          break;
          
        case 'phoneNumber':
          if (operator === 'startsWith' && value.startsWith('55')) {
            // Extrair DDD (código de área) do número
            const areaCode = value.substring(2, 4);
            serviceCriteria.areaCode = areaCode;
          }
          break;
          
        case 'createdAt':
          if (operator === 'greaterThan') {
            serviceCriteria.createdAfter = value;
          } else if (operator === 'lessThan') {
            serviceCriteria.createdBefore = value;
          }
          break;
          
        case 'updatedAt':
          if (operator === 'greaterThan') {
            serviceCriteria.updatedAfter = value;
          } else if (operator === 'lessThan') {
            serviceCriteria.updatedBefore = value;
          }
          break;
      }
    });
    
    return serviceCriteria;
  }

  /**
   * Busca contatos com base em critérios de segmentação avançados
   * @param {Object} criteria - Critérios de segmentação
   * @returns {Promise<Array>} Lista de contatos segmentados
   */
  async segmentContacts(criteria) {
    try {
      // Inicia com um query builder básico
      let query = Contact.find({ active: true });
      
      // Aplicar filtros baseados nos critérios
      if (criteria) {
        // Filtra por tags (pode incluir múltiplas tags)
        if (criteria.tags && criteria.tags.length > 0) {
          if (criteria.tagOperator === 'AND') {
            // Contatos que possuem TODAS as tags especificadas
            query = query.where('tags').all(criteria.tags);
          } else {
            // Contatos que possuem QUALQUER UMA das tags especificadas (OR é o padrão)
            query = query.where('tags').in(criteria.tags);
          }
        }
        
        // Filtra por nome
        if (criteria.nameContains) {
          query = query.where('name', new RegExp(criteria.nameContains, 'i'));
        }
        
        // Filtra por email
        if (criteria.emailContains) {
          query = query.where('email', new RegExp(criteria.emailContains, 'i'));
        }
        
        // Filtra por DDD (código de área)
        if (criteria.areaCode) {
          // Assume que o número está no formato 55DDNNNNNNNNN
          const areaCodeRegex = new RegExp(`^55${criteria.areaCode}`);
          query = query.where('phoneNumber', areaCodeRegex);
        }
        
        // Filtra por data de criação
        if (criteria.createdAfter) {
          query = query.where('createdAt').gte(new Date(criteria.createdAfter));
        }
        
        if (criteria.createdBefore) {
          query = query.where('createdAt').lte(new Date(criteria.createdBefore));
        }
        
        // Filtra por data de atualização
        if (criteria.updatedAfter) {
          query = query.where('updatedAt').gte(new Date(criteria.updatedAfter));
        }
        
        if (criteria.updatedBefore) {
          query = query.where('updatedAt').lte(new Date(criteria.updatedBefore));
        }
      }
      
      // Executa a consulta
      const contacts = await query.exec();
      
      // Se precisamos filtrar com base em engajamento, precisamos fazer pós-processamento
      if (criteria && (criteria.engagementType || criteria.engagementAfter || criteria.engagementBefore)) {
        // IDs dos contatos que encontramos até agora
        const contactIds = contacts.map(contact => contact._id);
        
        // Query para encontrar status de mensagens relacionadas a esses contatos
        let statusQuery = MessageStatus.find({
          contact: { $in: contactIds }
        });
        
        // Filtra por tipo de engajamento
        if (criteria.engagementType) {
          statusQuery = statusQuery.where('status', criteria.engagementType);
        }
        
        // Filtra por data de engajamento
        if (criteria.engagementAfter) {
          const dateField = this._getDateFieldForEngagementType(criteria.engagementType);
          if (dateField) {
            statusQuery = statusQuery.where(dateField).gte(new Date(criteria.engagementAfter));
          }
        }
        
        if (criteria.engagementBefore) {
          const dateField = this._getDateFieldForEngagementType(criteria.engagementType);
          if (dateField) {
            statusQuery = statusQuery.where(dateField).lte(new Date(criteria.engagementBefore));
          }
        }
        
        // Executa a consulta de status
        const messageStatuses = await statusQuery.exec();
        
        // Obtém IDs de contatos que têm o engajamento especificado
        const engagedContactIds = [...new Set(messageStatuses.map(status => status.contact.toString()))];
        
        // Filtra os contatos para incluir apenas aqueles com engajamento especificado
        if (criteria.engagementFilter === 'only') {
          // Mantém apenas contatos que têm o engajamento
          return contacts.filter(contact => 
            engagedContactIds.includes(contact._id.toString())
          );
        } else if (criteria.engagementFilter === 'exclude') {
          // Exclui contatos que têm o engajamento
          return contacts.filter(contact => 
            !engagedContactIds.includes(contact._id.toString())
          );
        }
      }
      
      return contacts;
    } catch (error) {
      console.error('Erro ao segmentar contatos:', error);
      throw error;
    }
  }
  
  /**
   * Busca contatos que leram mensagens específicas
   * @param {string|Array} messageIds - ID ou IDs das mensagens
   * @param {Date} after - Data de início para filtrar leituras
   * @param {Date} before - Data final para filtrar leituras
   * @returns {Promise<Array>} Lista de contatos que leram as mensagens
   */
  async getContactsWhoReadMessages(messageIds, after = null, before = null) {
    try {
      // Converte para array se for uma string
      if (typeof messageIds === 'string') {
        messageIds = [messageIds];
      }
      
      // Certifica-se de que os IDs sejam ObjectIDs válidos
      const validObjectIds = messageIds.map(id => 
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null
      ).filter(Boolean);
      
      if (validObjectIds.length === 0) {
        throw new Error('Nenhum ID de mensagem válido fornecido');
      }
      
      // Constrói a query para encontrar status de mensagens lidas
      let query = MessageStatus.find({
        message: { $in: validObjectIds },
        status: 'read'
      });
      
      // Adiciona filtros de data se fornecidos
      if (after) {
        query = query.where('readAt').gte(new Date(after));
      }
      
      if (before) {
        query = query.where('readAt').lte(new Date(before));
      }
      
      // Executa a consulta e popula os contatos
      const messageStatuses = await query.populate('contact').exec();
      
      // Retorna apenas os contatos únicos
      const uniqueContacts = {};
      messageStatuses.forEach(status => {
        if (status.contact) {
          uniqueContacts[status.contact._id] = status.contact;
        }
      });
      
      return Object.values(uniqueContacts);
    } catch (error) {
      console.error('Erro ao buscar contatos que leram mensagens:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma nova lista de contatos com base em critérios de segmentação
   * @param {string} name - Nome da nova tag a ser aplicada
   * @param {Object} criteria - Critérios de segmentação
   * @returns {Promise<Object>} Resultado da operação
   */
  async createContactSegment(name, criteria) {
    try {
      if (!name || !name.trim()) {
        throw new Error('Nome da tag de segmentação é obrigatório');
      }
      
      // Limpa o nome da tag
      const tagName = name.trim().toLowerCase();
      
      // Busca contatos com base nos critérios
      const contacts = await this.segmentContacts(criteria);
      
      if (contacts.length === 0) {
        return {
          success: false, 
          message: 'Nenhum contato encontrado com os critérios especificados',
          count: 0
        };
      }
      
      // Atualiza cada contato para adicionar a nova tag
      let updatedCount = 0;
      for (const contact of contacts) {
        // Adiciona a tag apenas se ainda não existir
        if (!contact.tags.includes(tagName)) {
          contact.tags.push(tagName);
          await contact.save();
          updatedCount++;
        }
      }
      
      return {
        success: true,
        message: `${updatedCount} contatos atualizados com a tag '${tagName}'`,
        count: updatedCount,
        totalContacts: contacts.length
      };
    } catch (error) {
      console.error('Erro ao criar segmento de contatos:', error);
      throw error;
    }
  }
  
  /**
   * Retorna o campo de data correspondente ao tipo de engajamento
   * @param {string} engagementType - Tipo de engajamento (sent, delivered, read, etc)
   * @returns {string|null} Nome do campo de data correspondente
   * @private
   */
  _getDateFieldForEngagementType(engagementType) {
    switch (engagementType) {
      case 'sent':
        return 'sentAt';
      case 'delivered':
        return 'deliveredAt';
      case 'read':
        return 'readAt';
      default:
        return null;
    }
  }
}

module.exports = new SegmentationService(); 