const evolutionApi = require('../config/evolutionApi');
const axios = require('axios');
const MessageStatus = require('../models/MessageStatus');

// Constantes para configuração de retry
const MAX_RETRIES = 4;
const RETRY_DELAY = 1000; // em milissegundos
const RETRY_MULTIPLIER = 2; // para backoff exponencial

class EvolutionApiService {
  constructor() {
    this.baseURL = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instance = process.env.WHATSAPP_INSTANCE;
    this.internalKey = null; // Chave API interna para operações privilegiadas
    this.isConnected = false; // Status da conexão com a API
  }

  /**
   * Define a chave de API interna para operações privilegiadas
   * @param {string} key - Chave de API interna
   */
  setInternalKey(key) {
    this.internalKey = key;
  }

  /**
   * Limpa a chave de API interna
   */
  clearInternalKey() {
    this.internalKey = null;
  }

  /**
   * Configuração padrão do Axios para as requisições da API
   * @returns {Object} Configuração do Axios
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.internalKey || this.apiKey
      },
      timeout: 30000 // 30 segundos
    };
  }

  /**
   * Executa uma requisição com retentativas em caso de falha
   * @param {Function} requestFn - Função que executa a requisição
   * @param {number} maxRetries - Número máximo de tentativas
   * @param {number} retryDelay - Atraso inicial entre tentativas (ms)
   * @param {number} retryMultiplier - Multiplicador para backoff exponencial
   * @returns {Promise<any>} Resultado da requisição
   */
  async _executeWithRetry(requestFn, maxRetries = MAX_RETRIES, retryDelay = RETRY_DELAY, retryMultiplier = RETRY_MULTIPLIER) {
    let lastError;
    let currentDelay = retryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Se for último erro, não logar para evitar duplicação
        if (attempt < maxRetries) {
          // Extrair informações úteis do erro para diagnóstico
          const status = error.response?.status;
          const data = error.response?.data;
          const headers = error.response?.headers;
          
          console.error(`Erro na requisição para Evolution API: ${error.message}`);
          console.error(`Erro na tentativa ${attempt}/${maxRetries}: ${error.message}`);
          
          if (status) {
            console.error(`Status: ${status}`);
          }
          
          if (data) {
            console.error(`Dados: ${JSON.stringify(data, null, 2)}`);
          }
          
          if (headers) {
            console.error(`Headers: ${JSON.stringify(headers, null, 2)}`);
          }
          
          // Adicionar atraso crescente entre as tentativas (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= retryMultiplier;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
  }

  /**
   * Realiza uma requisição HTTP genérica utilizando a configuração da API Evolution
   * @param {string} method - Método HTTP (get, post, put, delete)
   * @param {string} endpoint - Endpoint da API (sem a URL base)
   * @param {Object} data - Dados para enviar no corpo da requisição (para POST/PUT)
   * @param {Object} options - Opções adicionais para a requisição
   * @param {Object} options.headers - Headers adicionais para a requisição
   * @param {boolean} options.useInternalKey - Se deve usar a chave interna em vez da chave padrão
   * @param {number} options.maxRetries - Número máximo de tentativas (padrão é MAX_RETRIES)
   * @param {number} options.timeout - Timeout personalizado em ms
   * @returns {Promise<Object>} Resposta da requisição
   */
  async makeRequest(method, endpoint, data = null, options = {}) {
    const config = this.getConfig();
    
    // Aplicar opções personalizadas se fornecidas
    if (options.headers) {
      config.headers = { ...config.headers, ...options.headers };
    }
    
    if (options.timeout) {
      config.timeout = options.timeout;
    }
    
    // Forçar uso da chave interna se solicitado
    if (options.useInternalKey && this.internalKey) {
      config.headers.apikey = this.internalKey;
    }
    
    // Assegurar que o endpoint comece sem barra
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    
    return this._executeWithRetry(async () => {
      switch (method.toLowerCase()) {
        case 'get':
          return await axios.get(`/${formattedEndpoint}`, config);
        case 'post':
          return await axios.post(`/${formattedEndpoint}`, data, config);
        case 'put':
          return await axios.put(`/${formattedEndpoint}`, data, config);
        case 'delete':
          return await axios.delete(`/${formattedEndpoint}`, config);
        default:
          throw new Error(`Método HTTP não suportado: ${method}`);
      }
    }, options.maxRetries || MAX_RETRIES);
  }

  /**
   * Verifica se a instância do WhatsApp está conectada
   * @returns {Promise<Object>} Status da conexão
   */
  async checkConnectionStatus() {
    try {
      const response = await this.makeRequest('get', `instance/connectionState/${this.instance}`);
      
      // Atualiza flag de conexão
      this.isConnected = true;
      
      return { 
        success: true, 
        state: response.data.state,
        instance: {
          state: response.data.state,
          phone: null
        }
      };
    } catch (error) {
      // Se o erro for 404, pode ser que o endpoint tenha mudado, tentar alternativa
      if (error.response?.status === 404) {
        try {
          // Tentar endpoint alternativo
          const response = await this.makeRequest('get', `instance/info/${this.instance}`);
          
          // Atualiza flag de conexão
          this.isConnected = true;
          
          return { 
            success: true, 
            state: response.data.status || 'unknown',
            instance: {
              state: response.data.state || response.data.status || 'unknown',
              phone: response.data.phone || null
            }
          };
        } catch (fallbackError) {
          this.isConnected = false;
          
          if (fallbackError.response?.status === 404) {
            return {
              success: false,
              error: 'Instância não encontrada ou offline',
              instance: {
                state: 'closed',
                phone: null
              }
            };
          }
          
          throw fallbackError;
        }
      }
      
      // Outros erros
      this.isConnected = false;
      
      return {
        success: false,
        error: error.message,
        instance: {
          state: 'closed',
          phone: null
        }
      };
    }
  }

  /**
   * Formata um número de telefone para o padrão aceito pela Evolution API
   * @param {string} phoneNumber - Número de telefone para formatar
   * @returns {string} Número formatado
   * @private
   */
  _formatPhoneNumber(phoneNumber) {
    // Remove caracteres não numéricos
    let formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Verifica se já tem o código do país e adiciona se necessário
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = `55${formattedNumber}`;
    }
    
    // Garante que o número tenha o formato correto para o Brasil
    // 55 + DDD (2 dígitos) + Número (8 ou 9 dígitos)
    if (formattedNumber.length === 12 || formattedNumber.length === 13) {
      return formattedNumber;
    } else {
      console.warn(`Formato de número possivelmente incorreto: ${formattedNumber} (${formattedNumber.length} dígitos)`);
      return formattedNumber;
    }
  }

  /**
   * Envia uma mensagem de texto para um número
   * @param {string} to Número de telefone do destinatário
   * @param {string} text Texto da mensagem
   * @returns {Promise<Object>} Resposta da API
   */
  async sendTextMessage(to, text) {
    try {
      const formattedNumber = this._formatPhoneNumber(to);
      const data = { 
        number: formattedNumber, 
        text: text,
        delay: 1200
      };
      
      console.log(`[EvolutionApi] Enviando texto para ${formattedNumber}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      console.log(`[EvolutionApi] Payload: ${JSON.stringify(data)}`);
      
      const response = await this.makeRequest('post', `message/sendText/${this.instance}`, data);
      return response.data;
    } catch (error) {
      console.error(`Erro ao enviar mensagem de texto para ${to}: ${error.message}`);
      if (error.response) {
        console.error(`Detalhes do erro: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Envia uma mensagem com mídia via API Evolution
   * @param {string} phoneNumber Número de telefone do destinatário
   * @param {string} caption Texto da mensagem
   * @param {string} mediaUrl URL da mídia ou string base64
   * @param {string} mediaType Tipo de mídia (image, video, audio, document)
   * @returns {Promise<Object>} Resposta da API
   */
  async sendMediaMessage(phoneNumber, caption, mediaUrl, mediaType) {
    try {
      // Verificar parâmetros essenciais
      if (!phoneNumber) {
        throw new Error('Número de telefone é obrigatório');
      }
      
      if (!mediaUrl) {
        throw new Error('URL da mídia é obrigatória');
      }
      
      if (!this.isValidMediaType(mediaType)) {
        throw new Error(`Tipo de mídia não suportado: ${mediaType}`);
      }
      
      // Formatar o número de telefone
      const formattedPhone = this._formatPhoneNumber(phoneNumber);
      
      console.log(`[EvolutionApi] Enviando mídia tipo ${mediaType} para ${formattedPhone}`);
      
      // Criar payload conforme formato da Evolution API
      const payload = {
        number: formattedPhone,
        mediatype: mediaType.toLowerCase(),
        mimetype: this._getMimeType(mediaType),
        caption: caption || '',
        media: mediaUrl,
        fileName: this._getFileNameFromUrl(mediaUrl)
      };
      
      // Adicionar opções se necessário
      payload.delay = 1200;
      
      console.log(`[EvolutionApi] Payload: ${JSON.stringify({ 
        ...payload, 
        media: payload.media ? '[URL/BASE64 DATA]' : undefined 
      })}`);
      
      // Fazer a requisição
      const response = await this.makeRequest('POST', `message/sendMedia/${this.instance}`, payload);
      
      // Verificar e processar resposta
      if (response && response.data) {
        if (response.data.key) {
          console.log(`[EvolutionApi] Mídia enviada com sucesso para ${formattedPhone}, ID: ${response.data.key.id}`);
        } else {
          console.log(`[EvolutionApi] Mídia enviada com sucesso para ${formattedPhone}`);
        }
        return response.data;
      } else {
        console.warn(`[EvolutionApi] Resposta vazia ou sem chave`);
        return response || { success: true };
      }
    } catch (error) {
      console.error(`[EvolutionApi] Erro ao enviar mídia:`, error.message);
      
      // Se error.response existir, logar detalhes adicionais
      if (error.response) {
        console.error(`[EvolutionApi] Status: ${error.response.status}`);
        console.error(`[EvolutionApi] Dados: ${JSON.stringify(error.response.data)}`);
      }
      
      // Tentar enviar como texto se possível e solicitado
      if (caption && caption.trim()) {
        try {
          console.log(`[EvolutionApi] Tentando enviar apenas texto: ${caption}`);
          return await this.sendTextMessage(phoneNumber, caption);
        } catch (textError) {
          console.error(`[EvolutionApi] Também falhou ao enviar texto: ${textError.message}`);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Valida se o tipo de mídia é suportado
   * @param {string} mediaType Tipo de mídia a ser validado
   * @returns {boolean} Verdadeiro se o tipo for suportado
   */
  isValidMediaType(mediaType) {
    if (!mediaType) return false;
    
    const supportedTypes = ['image', 'video', 'audio', 'document'];
    return supportedTypes.includes(mediaType.toLowerCase());
  }

  /**
   * Obtém o status de uma mensagem
   * @param {string} messageId ID da mensagem
   * @returns {Promise<Object>} Status da mensagem
   */
  async getMessageStatus(messageId) {
    try {
      const response = await this.makeRequest('get', `message/getStatus/${this.instance}/${messageId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter status da mensagem ${messageId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém o QR Code para autenticação
   * @returns {Promise<Object>} Dados do QR Code
   */
  async getQrCode() {
    try {
      const response = await this.makeRequest('get', `instance/qrcode/${this.instance}`);
      
      // Se o QR code não estiver disponível, tenta iniciar a sessão
      if (response.data.error || !response.data.qrcode) {
        await this.makeRequest('post', `instance/start/${this.instance}`, {});
        return (await this.makeRequest('get', `instance/qrcode/${this.instance}`)).data;
      }
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter QR code: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica se um número existe no WhatsApp
   * @param {string} phoneNumber Número de telefone para verificar
   * @returns {Promise<Object>} Resultado da verificação
   */
  async checkNumber(phoneNumber) {
    try {
      const formattedNumber = this._formatPhoneNumber(phoneNumber);
      const response = await this.makeRequest('get', `chat/whatsappNumbers/${this.instance}?numbers[]=${formattedNumber}`);
      
      const result = response.data;
      return {
        success: true,
        number: formattedNumber,
        exists: result && result.numbers && result.numbers.length > 0 
          ? result.numbers[0].exists 
          : false,
        jid: result && result.numbers && result.numbers.length > 0 
          ? result.numbers[0].jid 
          : null
      };
    } catch (error) {
      console.error(`Erro ao verificar número ${phoneNumber}: ${error.message}`);
      return {
        success: false,
        number: phoneNumber,
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Reinicia a sessão do WhatsApp
   * @returns {Promise<Object>} Resposta da API
   */
  async restartSession() {
    try {
      // Primeiro tenta parar a instância
      const stopResult = await this.makeRequest('post', `instance/logout/${this.instance}`, {});
      
      // Espera um pouco antes de iniciar novamente
      await this._delay(2000);
      
      // Tenta iniciar a instância
      const startResult = await this.makeRequest('post', `instance/start/${this.instance}`, {});
      
      return {
        success: true,
        message: 'Sessão reiniciada com sucesso',
        stopResult: stopResult.data,
        startResult: startResult.data
      };
    } catch (error) {
      console.error('Erro ao reiniciar sessão:', error);
      return {
        success: false,
        message: 'Falha ao reiniciar sessão',
        error: error.message
      };
    }
  }

  /**
   * Obtém métricas de envio de mensagens
   * @returns {Promise<Object>} Métricas de envio
   */
  async getMetrics() {
    try {
      const response = await this.makeRequest('GET', 'metrics');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      throw error;
    }
  }

  /**
   * Testa a conexão com a Evolution API
   * @returns {Promise<Object>} Resultado do teste
   */
  async testConnection() {
    try {
      // Verificar se a API está acessível
      const status = await this.checkConnectionStatus();
      
      // Verificar se o QR Code está disponível
      const qrCode = await this.getQrCode();
      
      return {
        success: true,
        status,
        qrCode: qrCode.qrcode ? 'Disponível' : 'Não disponível',
        message: 'Conexão com a Evolution API está funcionando corretamente'
      };
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return {
        success: false,
        error: error.message,
        message: 'Falha ao conectar com a Evolution API'
      };
    }
  }

  /**
   * Executa testes de diagnóstico
   * @param {string} phoneNumber - Número de telefone para teste
   * @returns {Promise<Object>} Resultado dos testes
   */
  async runDiagnosticTests(phoneNumber) {
    try {
      const results = {
        success: true,
        tests: []
      };
      
      // Teste 1: Verificar status da conexão
      try {
        const status = await this.checkConnectionStatus();
        results.tests.push({
          name: 'Status da Conexão',
          success: status.status === 'CONNECTED',
          details: status
        });
      } catch (error) {
        results.tests.push({
          name: 'Status da Conexão',
          success: false,
          error: error.message
        });
      }
      
      // Teste 2: Verificar número
      try {
        const numberCheck = await this.checkNumber(phoneNumber);
        results.tests.push({
          name: 'Verificação de Número',
          success: numberCheck.exists,
          details: numberCheck
        });
      } catch (error) {
        results.tests.push({
          name: 'Verificação de Número',
          success: false,
          error: error.message
        });
      }
      
      // Teste 3: Enviar mensagem de teste
      try {
        const messageResult = await this.sendTextMessage(
          phoneNumber,
          'Mensagem de teste do sistema de diagnóstico'
        );
        results.tests.push({
          name: 'Envio de Mensagem',
          success: messageResult.success,
          details: messageResult
        });
      } catch (error) {
        results.tests.push({
          name: 'Envio de Mensagem',
          success: false,
          error: error.message
        });
      }
      
      // Calcular resultado geral
      results.success = results.tests.every(test => test.success);
      
      return results;
    } catch (error) {
      console.error('Erro ao executar testes de diagnóstico:', error);
      return {
        success: false,
        error: error.message,
        message: 'Falha ao executar testes de diagnóstico'
      };
    }
  }

  /**
   * Cria um atraso usando Promise
   * @param {number} ms - Tempo de atraso em milissegundos
   * @returns {Promise<void>} Promise que resolve após o atraso
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extrai o nome do arquivo de uma URL
   * @param {string} url URL da mídia
   * @returns {string} Nome do arquivo
   * @private
   */
  _getFileNameFromUrl(url) {
    try {
      // Extrair nome do arquivo da URL
      const urlPath = new URL(url).pathname;
      const fileName = urlPath.split('/').pop();
      
      // Se não conseguir extrair, usar nome genérico
      if (!fileName || fileName === '') {
        return 'documento.pdf';
      }
      
      return fileName;
    } catch (error) {
      return 'documento.pdf';
    }
  }

  /**
   * Obtém o MIME type baseado no tipo de mídia
   * @param {string} mediaType Tipo de mídia
   * @returns {string} MIME type correspondente
   * @private
   */
  _getMimeType(mediaType) {
    const mimeTypes = {
      'image': 'image/jpeg',
      'video': 'video/mp4',
      'audio': 'audio/mpeg',
      'document': 'application/pdf'
    };
    
    return mimeTypes[mediaType.toLowerCase()] || 'application/octet-stream';
  }
}

module.exports = new EvolutionApiService(); 