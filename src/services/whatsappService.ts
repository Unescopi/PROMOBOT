import axios from 'axios';
import { getEvolutionApiConfig } from './configService';

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

// Tipos para respostas da API
interface WhatsAppStatus {
  connected: boolean;
  state?: string;
  qrCode?: string;
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
  private apiKey: string;
  private instance: string;
  private headers: Record<string, string>;

  constructor() {
    // Valores padrão (serão substituídos ao chamar init())
    this.apiUrl = 'http://localhost:8080';
    this.apiKey = '';
    this.instance = 'promobot';
    this.headers = {};
  }

  /**
   * Inicializa o serviço com as configurações atuais
   */
  async init(): Promise<void> {
    const config = await getEvolutionApiConfig();
    
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.instance = config.instance;
    
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey
    };
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   */
  async checkConnection(): Promise<WhatsAppStatus> {
    await this.init();
    
    try {
      const response = await axios.get(
        `${this.apiUrl}/instance/connectionState/${this.instance}`,
        { headers: this.headers }
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
   * Obtém o QR Code para conexão do dispositivo
   */
  async getQRCode(): Promise<string | null> {
    await this.init();
    
    try {
      const response = await axios.get(
        `${this.apiUrl}/instance/qrcode/${this.instance}`,
        { headers: this.headers }
      );
      
      if (response.data && response.data.qrcode) {
        return response.data.qrcode;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      return null;
    }
  }

  /**
   * Envia mensagem de texto via WhatsApp
   */
  async sendTextMessage(to: string, message: string): Promise<SentMessage | null> {
    await this.init();
    
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
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
        },
        { headers: this.headers }
      );
      
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
    mediaType: 'image' | 'video' | 'audio' | 'document',
    options?: MediaOptions
  ): Promise<SentMessage | null> {
    await this.init();
    
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
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
            caption: options?.caption || ''
          };
          break;
        case 'video':
          payload.videoMessage = {
            video: mediaUrl,
            caption: options?.caption || ''
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
            fileName: options?.filename || 'documento.pdf',
            caption: options?.caption || ''
          };
          break;
      }
      
      const response = await axios.post(
        endpoint,
        payload,
        { headers: this.headers }
      );
      
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
      console.error(`Erro ao enviar mídia (${mediaType}):`, error);
      
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
   * Desconecta a instância do WhatsApp
   */
  async disconnect(): Promise<boolean> {
    await this.init();
    
    try {
      const response = await axios.delete(
        `${this.apiUrl}/instance/logout/${this.instance}`,
        { headers: this.headers }
      );
      
      return response.data && response.data.success === true;
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      return false;
    }
  }

  /**
   * Formata o número de telefone para padrão internacional
   */
  private formatPhoneNumber(phone: string): string {
    // Remover caracteres não numéricos
    let clean = phone.replace(/\D/g, '');
    
    // Verificar se já está no formato internacional
    if (clean.startsWith('55') && clean.length >= 12) {
      return clean;
    }
    
    // Adicionar código do país (Brasil = 55)
    if (!clean.startsWith('55')) {
      clean = '55' + clean;
    }
    
    return clean;
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
        message.mediaType,
        {
          caption: message.message,
          filename: message.filename
        }
      );
    } else {
      // Caso contrário, enviar como mensagem de texto
      return this.sendTextMessage(message.number, message.message);
    }
  }

  /**
   * Enviar mensagem em lote
   */
  async sendBatchMessages(messages: WhatsAppMessage[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Enviar cada mensagem com um atraso para evitar bloqueios
    for (const message of messages) {
      try {
        const result = await this.sendMessage(message);
        if (result) {
          success++;
        } else {
          failed++;
        }
        
        // Aguardar um intervalo entre as mensagens
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Erro ao enviar mensagem em lote:', error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Obter endpoint correto para tipo de mídia
   */
  private getMediaEndpoint(mediaType?: 'image' | 'video' | 'document'): string | null {
    switch (mediaType) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'document':
        return 'document';
      default:
        return null;
    }
  }
} 