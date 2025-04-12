import axios from 'axios';

// Configuração da API base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const DEFAULT_TIMEOUT = 30000; // 30 segundos

/**
 * Função para fazer requisições HTTP genéricas com retry
 * 
 * @param {string} method - Método HTTP ('GET', 'POST', 'PUT', 'DELETE')
 * @param {string} endpoint - Endpoint da API (sem a URL base)
 * @param {Object} data - Dados para enviar (para POST, PUT)
 * @param {Object} options - Opções adicionais
 * @param {Object} options.headers - Headers adicionais
 * @param {boolean} options.useInternalKey - Se deve usar a chave interna ao invés do token JWT
 * @param {number} options.maxRetries - Número máximo de tentativas (default: 2)
 * @param {number} options.timeout - Timeout em ms (default: DEFAULT_TIMEOUT)
 * @returns {Promise<any>} - Resposta da API
 */
export const makeRequest = async (method, endpoint, data = null, options = {}) => {
  const {
    headers = {},
    useInternalKey = false,
    maxRetries = 2,
    timeout = DEFAULT_TIMEOUT
  } = options;

  // Certifica que o endpoint comece com "/"
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Configuração da requisição
  const config = {
    method: method.toUpperCase(),
    url: `${API_BASE_URL}${formattedEndpoint}`,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  // Adiciona dados para requisições POST e PUT
  if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
    config.data = data;
  }

  // Adiciona parâmetros para requisições GET e DELETE
  if (data && (method.toUpperCase() === 'GET' || method.toUpperCase() === 'DELETE')) {
    config.params = data;
  }

  // Sistema de retry
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Adiciona token JWT do localStorage, se disponível e não estiver usando chave interna
      if (!useInternalKey) {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      lastError = error;
      
      // Verifica se deve tentar novamente
      const shouldRetry = attempt < maxRetries && 
                         (!error.response || (error.response.status >= 500 || error.response.status === 429));
      
      if (!shouldRetry) break;
      
      // Espera antes de tentar novamente (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  throw lastError;
};

// Criando uma instância do axios com configurações base
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisição para incluir o token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta para tratamento de erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    // Logar detalhes do erro para depuração
    if (response) {
      console.error('Erro da API:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        url: response.config.url,
        method: response.config.method,
      });
    } else {
      console.error('Erro de requisição (sem resposta):', error.message);
    }
    
    // Se o erro for 401 (Não autorizado), redireciona para login
    if (response && response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Funções auxiliares para as requisições
const apiService = {
  // Autenticação
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    refreshToken: () => api.post('/auth/refresh-token'),
    logout: () => api.post('/auth/logout'),
  },

  // Contatos
  contacts: {
    getAll: (params = {}) => {
      // Validar os parâmetros antes de enviar a requisição
      const validParams = {};
      
      // Adicionar apenas parâmetros válidos que o backend espera
      if (params.page && Number.isInteger(Number(params.page)) && Number(params.page) > 0) {
        validParams.page = params.page;
      }
      
      if (params.limit && Number.isInteger(Number(params.limit)) && Number(params.limit) > 0) {
        validParams.limit = Math.min(Number(params.limit), 100); // Máximo de 100 conforme validador
      }
      
      if (params.search && typeof params.search === 'string') {
        validParams.search = params.search;
      }
      
      if (params.tag && typeof params.tag === 'string') {
        validParams.tag = params.tag;
      }
      
      if (params.sortBy && ['name', 'createdAt', 'updatedAt'].includes(params.sortBy)) {
        validParams.sortBy = params.sortBy;
      }
      
      if (params.direction && ['asc', 'desc'].includes(params.direction)) {
        validParams.direction = params.direction;
      }
      
      console.log('Enviando parâmetros validados para API de contatos:', validParams);
      return api.get('/contacts', { params: validParams });
    },
    getById: (id) => api.get(`/contacts/${id}`),
    create: (data) => api.post('/contacts', data),
    update: (id, data) => api.put(`/contacts/${id}`, data),
    delete: (id) => api.delete(`/contacts/${id}`),
    import: (data) => api.post('/contacts/import', data),
    export: () => api.get('/contacts/export'),
  },

  // Campanhas
  campaigns: {
    getAll: (params) => api.get('/campaigns', { params }),
    getById: (id) => api.get(`/campaigns/${id}`),
    create: (data) => api.post('/campaigns', data),
    update: (id, data) => api.put(`/campaigns/${id}`, data),
    delete: (id) => api.delete(`/campaigns/${id}`),
    start: (id) => api.post(`/campaigns/${id}/start`),
    pause: (id) => api.post(`/campaigns/${id}/pause`),
    resume: (id) => api.post(`/campaigns/${id}/resume`),
    getStats: (id) => api.get(`/campaigns/${id}/stats`),
  },

  // Notificações
  notifications: {
    getHistory: () => api.get('/notifications/history'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    clearHistory: () => api.delete('/notifications/history'),
    updateSettings: (settings) => api.put('/notifications/settings', settings),
    getSettings: () => api.get('/notifications/settings'),
    testSound: (soundUrl) => {
      // Retorna uma promise que resolve quando o som termina de tocar
      return new Promise((resolve, reject) => {
        const audio = new Audio(soundUrl);
        audio.onended = () => resolve();
        audio.onerror = (error) => reject(error);
        audio.play().catch(reject);
      });
    },
    // Função para adicionar uma nova notificação
    create: (notification) => {
      const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
      
      // Verificar se o tipo de notificação está habilitado
      if (settings.notifyOn && !settings.notifyOn[notification.type]) {
        return Promise.resolve();
      }
      
      // Tocar som se estiver habilitado
      if (settings.enableSoundEffects && notification.soundEffect) {
        const audio = new Audio(notification.soundEffect);
        audio.play().catch(console.error);
      }
      
      return api.post('/notifications', notification);
    },
    // Função para buscar notificações não lidas
    getUnread: () => api.get('/notifications/unread'),
    // Função para marcar todas como lidas
    markAllAsRead: () => api.put('/notifications/mark-all-read'),
  },

  // Segmentação
  segmentation: {
    segmentContacts: (criteria) => api.post('/segmentation/segment', criteria),
    getContactsWhoReadMessages: (params) => 
      api.get('/segmentation/contacts-who-read', { params }),
    createContactSegment: (data) => 
      api.post('/segmentation/create-segment', data),
  },

  // Mensagens
  messages: {
    getAll: (params) => api.get('/messages', { params }),
    getById: (id) => api.get(`/messages/${id}`),
    create: (data) => {
      console.log('[API Service] Criando mensagem com dados:', JSON.stringify(data));
      
      // Verificar se o formato dos dados está correto
      const cleanData = { ...data };
      
      // Remover campos vazios ou null/undefined
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === null || cleanData[key] === undefined || 
            (typeof cleanData[key] === 'string' && cleanData[key].trim() === '')) {
          delete cleanData[key];
        }
      });
      
      console.log('[API Service] Dados limpos:', JSON.stringify(cleanData));
      console.log('[API Service] Endpoint usado:', `${API_BASE_URL}/messages`);
      
      return api.post('/messages', cleanData);
    },
    update: (id, data) => {
      console.log('[API Service] Atualizando mensagem com ID:', id);
      console.log('[API Service] Usando dados:', JSON.stringify(data));
      return api.put(`/messages/${id}`, data);
    },
    delete: (id) => api.delete(`/messages/${id}`),
    getTemplates: () => api.get('/messages/templates'),
    createTemplate: (data) => api.post('/messages/templates', data),
    uploadMedia: (formData) => {
      console.log('Enviando arquivo para upload');
      return api.post('/messages/upload-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
  },

  // WhatsApp API
  whatsapp: {
    getStatus: () => api.get('/whatsapp/status'),
    getQrCode: () => api.get('/whatsapp/qrcode'),
    disconnect: () => api.post('/whatsapp/disconnect'),
    reconnect: () => api.post('/whatsapp/reconnect'),
    checkNumber: (phone) => api.post('/whatsapp/check-number', { phone }),
  },

  // Dashboard e estatísticas
  dashboard: {
    getStats: async () => {
      try {
        return await makeRequest('GET', '/dashboard/stats');
      } catch (error) {
        console.error('Erro ao obter estatísticas do dashboard:', error);
        throw error;
      }
    },
    getRecentActivity: async () => {
      try {
        return await makeRequest('GET', '/dashboard/recent-activity');
      } catch (error) {
        console.error('Erro ao obter atividades recentes:', error);
        throw error;
      }
    },
    getMessageStats: async (params = {}) => {
      try {
        return await makeRequest('GET', '/dashboard/message-stats', params);
      } catch (error) {
        console.error('Erro ao obter estatísticas de mensagens:', error);
        throw error;
      }
    }
  },

  // Configurações
  settings: {
    getSettings: async () => {
      try {
        const response = await api.get('/settings');
        return response.data;
      } catch (error) {
        console.error('Erro ao obter configurações:', error);
        throw error;
      }
    },

    updateSettings: async (settings) => {
      try {
        const response = await api.put('/settings', settings);
        return response.data;
      } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        throw error;
      }
    },

    testConnection: () => api.post('/settings/test-connection'),

    // Funções de manutenção
    clearCache: async () => {
      try {
        const response = await api.post('/settings/maintenance/clear-cache');
        return response.data;
      } catch (error) {
        console.error('Erro ao limpar cache:', error);
        throw error;
      }
    },

    backup: async () => {
      try {
        const response = await api.get('/settings/maintenance/backup');
        return response.data;
      } catch (error) {
        console.error('Erro ao fazer backup:', error);
        throw error;
      }
    },

    // Funções de notificação
    notifications: {
      // Testar configurações de email
      testEmail: async (email) => {
        try {
          const response = await api.post('/settings/notifications/test-email', { email });
          return response.data;
        } catch (error) {
          console.error('Erro ao testar email:', error);
          throw error;
        }
      },

      // Obter histórico de notificações
      getHistory: async (params = {}) => {
        try {
          const response = await api.get('/settings/notifications/history', { params });
          return response.data;
        } catch (error) {
          console.error('Erro ao obter histórico de notificações:', error);
          throw error;
        }
      },

      // Limpar histórico de notificações
      clearHistory: async () => {
        try {
          const response = await api.delete('/settings/notifications/history');
          return response.data;
        } catch (error) {
          console.error('Erro ao limpar histórico de notificações:', error);
          throw error;
        }
      }
    }
  },

  // Evolution API
  evolutionApi: {
    getStatus: () => api.get('/evolution-api/status'),
    getQrCode: () => api.get('/evolution-api/qrcode'),
    sendText: (data) => api.post('/evolution-api/send/text', data),
    sendMedia: (data) => api.post('/evolution-api/send/media', data),
    checkNumber: (phoneNumber) => api.post('/evolution-api/check-number', { phoneNumber }),
    disconnect: () => api.post('/evolution-api/restart'),
    testConnection: () => api.get('/evolution-api/test-connection'),
    runDiagnostic: (phoneNumber) => api.post('/evolution-api/run-diagnostics', { phoneNumber }),
    
    // Função para testar envio de mídia específica
    testMedia: async (data) => {
      try {
        // Mapa de tipos MIME para os tipos de mídia
        const mimeTypes = {
          image: 'image/jpeg',
          video: 'video/mp4',
          audio: 'audio/mpeg',
          document: 'application/pdf'
        };
        
        // Preparar o payload para envio pelo endpoint do backend
        let payload = {
          phone: data.phone,
          mediaType: data.mediaType || 'image',
          message: data.message || '',
        };
        
        // Adicionar a URL da mídia ou base64
        if (data.mediaUrl) {
          // Se for base64, extrair os dados e MIME type
          if (data.mediaUrl.startsWith('data:')) {
            const matches = data.mediaUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            
            if (matches && matches.length === 3) {
              payload.mediaBase64 = matches[2];
              payload.mediaMimeType = matches[1];
              console.log(`Convertido base64 com mime type: ${matches[1]}`);
              
              // Adicionar campos específicos da Evolution API
              payload.evolutionPayload = {
                mediatype: data.mediaType || 'image',
                mimetype: matches[1],
                media: matches[2],
                caption: data.message || ''
              };
            } else {
              console.error('Formato base64 inválido');
            }
          } else {
            payload.mediaUrl = data.mediaUrl;
            
            // Adicionar campos específicos da Evolution API
            payload.evolutionPayload = {
              mediatype: data.mediaType || 'image',
              mimetype: mimeTypes[data.mediaType || 'image'] || 'application/octet-stream',
              url: data.mediaUrl,
              caption: data.message || ''
            };
          }
        } else if (data.mediaBase64 && data.mediaMimeType) {
          payload.mediaBase64 = data.mediaBase64;
          payload.mediaMimeType = data.mediaMimeType;
          
          // Adicionar campos específicos da Evolution API
          payload.evolutionPayload = {
            mediatype: data.mediaType || 'image',
            mimetype: data.mediaMimeType,
            media: data.mediaBase64,
            caption: data.message || ''
          };
        } else {
          throw new Error('Nem URL nem base64 foram fornecidos para teste de mídia');
        }
        
        // Usar o endpoint do nosso backend, não direto da Evolution API
        const endpoint = '/evolution-api/send/media';
        
        console.log(`Enviando mídia para o backend: ${endpoint}`);
        console.log('Payload:', JSON.stringify({
          ...payload,
          mediaBase64: payload.mediaBase64 ? '[BASE64 ENCURTADO]' : undefined,
          evolutionPayload: payload.evolutionPayload ? {
            ...payload.evolutionPayload,
            media: '[BASE64 ENCURTADO]'
          } : undefined
        }));
        
        // Fazer a requisição para o backend
        const response = await api.post(endpoint, payload);
        return { success: true, data: response.data };
      } catch (error) {
        console.error('Erro ao enviar mídia de teste:', error);
        
        // Se a chamada falhou, tentar enviar apenas texto
        if (data.message) {
          try {
            console.log('Tentando enviar apenas texto como alternativa');
            const textResponse = await api.post(`/evolution-api/send/text`, {
              phone: data.phone,
              text: data.message
            });
            return { 
              success: true, 
              data: textResponse.data,
              fallbackUsed: true,
              message: 'Enviado apenas texto, a mídia falhou.'
            };
          } catch (textError) {
            console.error('Também falhou ao enviar texto:', textError);
          }
        }
        
        return { 
          success: false, 
          message: error.response?.data?.message || error.message 
        };
      }
    },
    
    // Função para testar texto
    testText: async (phoneNumber, text) => {
      try {
        const payload = {
          phoneNumber,
          text
        };
        
        console.log(`Testando envio de texto para ${phoneNumber}`);
        
        return await makeRequest('POST', '/evolution-api/send/text', payload);
      } catch (error) {
        console.error('Erro ao testar texto:', error);
        throw error;
      }
    }
  },
};

export default apiService; 