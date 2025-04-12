const Message = require('../models/Message');

class MessageService {
  constructor() {
    this.evolutionApiService = require('./evolutionApiService');
  }

  /**
   * Cria uma nova mensagem
   * @param {Object} messageData - Dados da mensagem
   * @returns {Promise<Object>} Mensagem criada
   */
  async createMessage(messageData) {
    try {
      const message = new Message(messageData);
      await message.save();
      return message;
    } catch (error) {
      console.error('Erro ao criar mensagem:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as mensagens
   * @param {Object} filter - Filtros opcionais
   * @returns {Promise<Array>} Lista de mensagens
   */
  async getMessages(filter = {}) {
    try {
      return await Message.find(filter).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }
  }

  /**
   * Obtém uma mensagem pelo ID
   * @param {string} id - ID da mensagem
   * @returns {Promise<Object>} Mensagem encontrada
   */
  async getMessageById(id) {
    try {
      return await Message.findById(id);
    } catch (error) {
      console.error('Erro ao buscar mensagem:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma mensagem existente
   * @param {string} id - ID da mensagem
   * @param {Object} updateData - Dados para atualização
   * @returns {Promise<Object>} Mensagem atualizada
   */
  async updateMessage(id, updateData) {
    try {
      return await Message.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error);
      throw error;
    }
  }

  /**
   * Remove uma mensagem
   * @param {string} id - ID da mensagem
   * @returns {Promise<Object>} Resultado da operação
   */
  async deleteMessage(id) {
    try {
      await Message.findByIdAndDelete(id);
      return { success: true, message: 'Mensagem removida com sucesso' };
    } catch (error) {
      console.error('Erro ao remover mensagem:', error);
      throw error;
    }
  }
  
  /**
   * Processa uma mensagem com variáveis personalizadas
   * @param {Object} message - Objeto da mensagem
   * @param {Object} variables - Objeto com variáveis para substituição
   * @returns {string} Conteúdo processado da mensagem
   */
  processMessageTemplate(message, variables = {}) {
    try {
      let content = message.content;
      
      // Substituir variáveis padrão
      content = content.replace(/\{nome\}/gi, variables.nome || '')
                       .replace(/\{name\}/gi, variables.nome || '')
                       .replace(/\{data\}/gi, new Date().toLocaleDateString('pt-BR'))
                       .replace(/\{date\}/gi, new Date().toLocaleDateString('pt-BR'));
      
      // Substituir outras variáveis personalizadas
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'gi');
        content = content.replace(regex, variables[key]);
      });
      
      return content;
    } catch (error) {
      console.error('Erro ao processar template da mensagem:', error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem
   * @param {string} phoneNumber - Número de telefone
   * @param {string} message - Texto da mensagem
   * @param {string} contactName Nome do contato (opcional)
   * @returns {Promise<Object>} - Resposta da API
   */
  async sendMessage(phoneNumber, message, contactName = '') {
    try {
      if (!phoneNumber) {
        throw new Error('Número de telefone é obrigatório');
      }
      
      if (!message) {
        throw new Error('Mensagem é obrigatória');
      }
      
      // Verificar se a mensagem contém mídia no formato [media:type:url]texto
      const mediaRegex = /^\[media:(image|video|audio|document):(.+?)\](.*)$/is;
      const mediaMatch = message.match(mediaRegex);
      
      if (mediaMatch) {
        // Extrair informações da mídia
        const mediaType = mediaMatch[1].toLowerCase();
        const mediaUrl = mediaMatch[2].trim();
        const messageText = mediaMatch[3].trim();
        
        console.log(`[MessageService] Detectada mídia do tipo ${mediaType}: ${mediaUrl}`);
        console.log(`[MessageService] Texto da mensagem: ${messageText}`);
        
        // Validar URL da mídia
        if (!this.isValidUrl(mediaUrl)) {
          console.error(`[MessageService] URL de mídia inválida: ${mediaUrl}`);
          throw new Error(`URL de mídia inválida: ${mediaUrl}`);
        }
        
        try {
          // Tentar enviar mensagem com mídia
          console.log(`[MessageService] Enviando mensagem com mídia do tipo ${mediaType} para ${phoneNumber}`);
          const result = await this.evolutionApiService.sendMediaMessage(
            phoneNumber,
            messageText, // texto como legenda
            mediaUrl,
            mediaType
          );
          
          // Registrar o envio da mensagem
          await this.logMessageSent(phoneNumber, message, contactName);
          
          return result;
        } catch (mediaError) {
          console.error(`[MessageService] Erro ao enviar mídia: ${mediaError.message}`);
          
          // Se falhar o envio da mídia, tentar enviar apenas o texto se houver
          if (messageText) {
            console.log(`[MessageService] Tentando enviar apenas o texto: "${messageText}"`);
            const textResult = await this.evolutionApiService.sendTextMessage(phoneNumber, messageText);
            
            // Registrar envio parcial (apenas texto)
            await this.logMessageSent(phoneNumber, messageText, contactName, 'Mídia falhou, apenas texto enviado');
            
            return textResult;
          }
          
          // Se não houver texto, repassar o erro
          throw mediaError;
        }
      } else {
        // Mensagem normal de texto
        console.log(`[MessageService] Enviando mensagem de texto para ${phoneNumber}`);
        const result = await this.evolutionApiService.sendTextMessage(phoneNumber, message);
        
        // Registrar o envio da mensagem
        await this.logMessageSent(phoneNumber, message, contactName);
        
        return result;
      }
    } catch (error) {
      console.error(`[MessageService] Erro ao enviar mensagem para ${phoneNumber}: ${error.message}`);
      
      // Registrar falha no envio
      await this.logMessageFailed(phoneNumber, message, error.message, contactName);
      
      throw error;
    }
  }
  
  /**
   * Registra uma mensagem enviada com sucesso
   * @param {string} phoneNumber - Número do telefone destinatário
   * @param {string} content - Conteúdo da mensagem
   * @param {string} contactName - Nome do contato (opcional)
   * @param {string} notes - Observações adicionais (opcional)
   * @returns {Promise<Object>} Registro da mensagem
   */
  async logMessageSent(phoneNumber, content, contactName = '', notes = '') {
    try {
      const messageLog = new Message({
        phoneNumber: phoneNumber,
        content: content,
        status: 'delivered',
        contactName: contactName,
        notes: notes
      });
      
      await messageLog.save();
      return messageLog;
    } catch (error) {
      console.error(`[MessageService] Erro ao registrar mensagem enviada: ${error.message}`);
      // Não propagar este erro para não interromper o fluxo principal
    }
  }
  
  /**
   * Registra uma falha no envio de mensagem
   * @param {string} phoneNumber - Número do telefone destinatário
   * @param {string} content - Conteúdo da mensagem
   * @param {string} errorMessage - Mensagem de erro
   * @param {string} contactName - Nome do contato (opcional)
   * @returns {Promise<Object>} Registro da mensagem
   */
  async logMessageFailed(phoneNumber, content, errorMessage, contactName = '') {
    try {
      const messageLog = new Message({
        phoneNumber: phoneNumber,
        content: content,
        status: 'failed',
        contactName: contactName,
        notes: `Erro: ${errorMessage}`
      });
      
      await messageLog.save();
      return messageLog;
    } catch (error) {
      console.error(`[MessageService] Erro ao registrar falha de mensagem: ${error.message}`);
      // Não propagar este erro para não interromper o fluxo principal
    }
  }

  /**
   * Verifica se uma URL é válida
   * @param {string} url - URL a ser validada
   * @returns {boolean} - true se a URL for válida
   */
  isValidUrl(url) {
    if (!url) return false;
    
    try {
      // Verificar formato básico usando regex mais abrangente
      const urlRegex = /^(https?:\/\/)([a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+|localhost)(:\d+)?(\/[-a-zA-Z0-9%_.~#+]*)*(\?[;&a-zA-Z0-9%_.~+=-]*)?(#[-a-zA-Z0-9%_.~+=#]*)?$/i;
      
      if (!urlRegex.test(url)) {
        console.log(`[MessageService] URL não corresponde ao padrão: ${url}`);
        return false;
      }
      
      // Validação adicional com URL API
      const urlObj = new URL(url);
      
      // Verificar protocolo (apenas HTTP e HTTPS são permitidos)
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.log(`[MessageService] Protocolo não suportado: ${urlObj.protocol}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.log(`[MessageService] Erro ao validar URL: ${error.message}`);
      return false;
    }
  }
}

module.exports = new MessageService(); 