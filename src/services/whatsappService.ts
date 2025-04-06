import axios from 'axios';

/**
 * Interface para mensagem do WhatsApp
 */
export interface WhatsAppMessage {
  number: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  filename?: string;
}

// Interface para mensagem enviada
interface SentMessage {
  id: string;
  status: 'sent' | 'queued' | 'failed';
  to: string;
  timestamp: number;
}

// Opções para envio de mídia
interface MediaOptions {
  filename?: string;
  caption?: string;
}

/**
 * Serviço para integração com WhatsApp via Evolution API
 * A Evolution API já está configurada na VPS e a comunicação é feita via webhook
 */
export class WhatsAppService {
  private apiUrl: string;
  private instance: string;

  constructor() {
    // URL da Evolution API local na VPS (já configurada)
    this.apiUrl = 'http://localhost:8080';
    this.instance = 'PradoBot';
    console.log(`WhatsAppService inicializado: URL=${this.apiUrl}, Instância=${this.instance}`);
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   */
  async checkConnection(): Promise<{ connected: boolean; state?: string; qrCode?: string }> {
    try {
      console.log(`Verificando status de conexão da instância ${this.instance}...`);
      const response = await axios.get(
        `${this.apiUrl}/instance/connectionState/${this.instance}`
      );
      
      console.log('Resposta status conexão:', response.data);
      
      if (response.data && response.data.state) {
        const state = response.data.state;
        
        return {
          connected: state === 'open',
          state: state,
          qrCode: state === 'requiresQrCode' ? response.data.qrcode : undefined
        };
      }
      
      return { connected: false };
    } catch (error) {
      console.error('Erro ao verificar conexão com WhatsApp:', error);
      return { connected: false };
    }
  }

  /**
   * Formata o número de telefone para o padrão da API
   */
  private formatPhoneNumber(phone: string): string {
    // Remover caracteres não numéricos
    let formatted = phone.replace(/\D/g, '');
    
    // Verificar formato específico para Brasil (padrão da Evolution API)
    if (formatted.length === 11 && formatted.startsWith('55')) {
      // Já está no formato correto com DDD e país (55)
      // Não fazer nada
    } else if (formatted.length === 11 && !formatted.startsWith('55')) {
      // Tem 11 dígitos mas não começa com 55, adicionar código do país
      formatted = `55${formatted}`;
    } else if (formatted.length === 10 && !formatted.startsWith('55')) {
      // Tem 10 dígitos (sem o 9 na frente), adicionar código do país
      formatted = `55${formatted}`;
    } else if (formatted.length === 9) {
      // Somente o número, sem DDD e país - geralmente inválido, mas tentaremos
      console.warn(`Número de telefone curto demais (9 dígitos): ${phone}. Certifique-se de incluir o DDD.`);
    } else if (formatted.length < 10) {
      // Número inválido ou muito curto
      console.error(`Número de telefone inválido: ${phone}`);
    } else if (!formatted.startsWith('55') && formatted.length >= 10) {
      // Para outros casos onde não temos 55 no início
      formatted = `55${formatted}`;
    }
    
    // Garantir que termine com @c.us para o formato da Evolution API
    if (!formatted.includes('@')) {
      formatted = `${formatted}@c.us`;
    }
    
    console.log(`Telefone formatado: ${phone} → ${formatted}`);
    return formatted;
  }

  /**
   * Envia mensagem de texto via WhatsApp
   */
  async sendTextMessage(to: string, message: string): Promise<SentMessage | null> {
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
      console.log(`Enviando mensagem de texto para ${formattedTo}: ${message.substring(0, 30)}...`);
      
      const payload = {
        number: formattedTo,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        textMessage: {
          text: message
        }
      };
      
      console.log('Payload do envio:', JSON.stringify(payload));
      
      try {
        const response = await axios.post(
          `${this.apiUrl}/message/text/${this.instance}`,
          payload,
          { timeout: 10000 } // Adiciona um timeout de 10 segundos para a requisição
        );
        
        console.log('Resposta do envio de texto:', JSON.stringify(response.data));
        
        if (response.data && response.data.key) {
          return {
            id: response.data.key.id,
            status: 'sent',
            to: formattedTo,
            timestamp: Date.now()
          };
        } else if (response.data && response.data.status) {
          // Formato alternativo de resposta
          return {
            id: Date.now().toString(),
            status: response.data.status === 'success' ? 'sent' : 'failed',
            to: formattedTo,
            timestamp: Date.now()
          };
        } else {
          console.warn('Resposta inválida da API:', response.data);
          return null;
        }
      } catch (apiError) {
        console.error('Erro na chamada API para enviar mensagem:', apiError);
        if (axios.isAxiosError(apiError)) {
          console.error(`Erro HTTP: ${apiError.response?.status} - ${apiError.response?.statusText}`);
          console.error('Detalhes:', apiError.response?.data);
        }
        throw apiError; // Re-throw para ser capturado pelo catch externo
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem de texto:', error);
      
      // Retornar um objeto de erro para facilitar tratamento no cliente
      return {
        id: Date.now().toString(),
        status: 'failed',
        to: to,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Envia mensagem de mídia via WhatsApp
   */
  async sendMediaMessage(
    to: string, 
    mediaUrl: string, 
    caption: string = '',
    mediaType: 'image' | 'video' | 'document' | 'audio' = 'image'
  ): Promise<SentMessage | null> {
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
      console.log(`Enviando mídia (${mediaType}) para ${formattedTo}: ${mediaUrl}`);
      
      const endpoint = `${this.apiUrl}/message/${mediaType}/${this.instance}`;
      
      const payload: any = {
        number: formattedTo,
        options: {
          delay: 1200
        }
      };
      
      // Configurar o payload baseado no tipo de mídia
      switch (mediaType) {
        case 'image':
          payload.imageMessage = {
            image: mediaUrl,
            caption: caption || ''
          };
          break;
        case 'video':
          payload.videoMessage = {
            video: mediaUrl,
            caption: caption || ''
          };
          break;
        case 'audio':
          payload.audioMessage = {
            audio: mediaUrl
          };
          break;
        case 'document':
          payload.documentMessage = {
            document: mediaUrl,
            fileName: 'documento.pdf',
            caption: caption || ''
          };
          break;
      }
      
      console.log('Payload do envio de mídia:', JSON.stringify(payload));
      
      const response = await axios.post(endpoint, payload);
      
      console.log('Resposta do envio de mídia:', response.data);
      
      if (response.data && response.data.key) {
        return {
          id: response.data.key.id,
          status: 'sent',
          to: formattedTo,
          timestamp: Date.now()
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Erro ao enviar mensagem de mídia (${mediaType}):`, error);
      return {
        id: Date.now().toString(),
        status: 'failed',
        to: to,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Envia mensagem via WhatsApp (texto ou mídia)
   */
  async sendMessage(message: WhatsAppMessage): Promise<SentMessage | null> {
    console.log(`Processando envio de mensagem para ${message.number}`);
    
    if (message.mediaUrl && message.mediaType) {
      // Se tiver mídia, enviar como mensagem de mídia
      return this.sendMediaMessage(
        message.number,
        message.mediaUrl,
        message.message
      );
    } else {
      // Caso contrário, enviar como mensagem de texto
      return this.sendTextMessage(message.number, message.message);
    }
  }
} 