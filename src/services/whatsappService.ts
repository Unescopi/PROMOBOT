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

/**
 * Serviço para integração com WhatsApp via Evolution API
 */
export class WhatsAppService {
  private instance: string;
  private apiUrl: string;

  constructor() {
    this.instance = 'PradoBot';
    this.apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    console.log(`WhatsAppService inicializado: Instância=${this.instance}, API=${this.apiUrl}`);
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   */
  async checkConnection(): Promise<{ connected: boolean; state?: string; qrCode?: string }> {
    try {
      console.log(`Verificando status de conexão da instância ${this.instance}`);
      
      const response = await axios.get(`${this.apiUrl}/instance/connectionState/${this.instance}`);
      
      if (response.status === 200 && response.data) {
        const state = response.data.state;
        console.log(`Estado da conexão: ${state}`);
        
        // Retorna o estado da conexão
        return {
          connected: state === 'open',
          state: state
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
    
    // Verificar formato específico para Brasil
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
      
      const response = await axios.post(
        `${this.apiUrl}/message/text/${this.instance}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EVOLUTION_API_KEY || ''
          }
        }
      );
      
      if (response.status === 201 || response.status === 200) {
        console.log(`Mensagem enviada com sucesso: ${response.data.key?.id || 'Sem ID'}`);
        return {
          id: response.data.key?.id || `send_${Date.now()}`,
          status: 'sent',
          to: formattedTo,
          timestamp: Date.now()
        };
      } else {
        console.error(`Falha no envio. Status: ${response.status}`, response.data);
        return {
          id: `err_${Date.now()}`,
          status: 'failed',
          to: formattedTo,
          timestamp: Date.now()
        };
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem de texto:', error.message);
      if (error.response) {
        console.error('Resposta da API:', error.response.data);
      }
      
      return {
        id: `err_${Date.now().toString()}`,
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
      
      let payload: any = {
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
      
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EVOLUTION_API_KEY || ''
        }
      });
      
      if (response.status === 201 || response.status === 200) {
        console.log(`Mídia enviada com sucesso: ${response.data.key?.id || 'Sem ID'}`);
        return {
          id: response.data.key?.id || `send_media_${Date.now()}`,
          status: 'sent',
          to: formattedTo,
          timestamp: Date.now()
        };
      } else {
        console.error(`Falha no envio de mídia. Status: ${response.status}`, response.data);
        return {
          id: `err_media_${Date.now()}`,
          status: 'failed',
          to: formattedTo,
          timestamp: Date.now()
        };
      }
    } catch (error: any) {
      console.error(`Erro ao enviar mídia (${mediaType}):`, error.message);
      if (error.response) {
        console.error('Resposta da API:', error.response.data);
      }
      
      return {
        id: `err_media_${Date.now().toString()}`,
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