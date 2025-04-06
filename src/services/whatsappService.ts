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
 */
export class WhatsAppService {
  private apiUrl: string;
  private instance: string;

  constructor() {
    // URL da Evolution API local na VPS (já configurada)
    this.apiUrl = 'http://localhost:8080';
    this.instance = 'PradoBot';
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   */
  async checkConnection(): Promise<{ connected: boolean; state?: string; qrCode?: string }> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/instance/connectionState/${this.instance}`
      );
      
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
    
    // Adicionar código do país (55) se não existir e número tiver 10 ou 11 dígitos (BR)
    if (!formatted.startsWith('55') && (formatted.length === 10 || formatted.length === 11)) {
      formatted = `55${formatted}`;
    }
    
    // Garantir que termine com @c.us para o formato da Evolution API
    if (!formatted.includes('@')) {
      formatted = `${formatted}@c.us`;
    }
    
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
      
      const response = await axios.post(
        `${this.apiUrl}/message/text/${this.instance}`,
        {
          number: formattedTo,
          options: {
            delay: 1200,
            presence: 'composing'
          },
          textMessage: {
            text: message
          }
        }
      );
      
      console.log('Resposta do envio de texto:', response.data);
      
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