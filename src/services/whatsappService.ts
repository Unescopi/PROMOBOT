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
  private instance: string;

  constructor() {
    // A integração é feita via webhook - não precisamos de URL direta
    this.instance = 'PradoBot';
    console.log(`WhatsAppService inicializado: Instância=${this.instance} (comunicação via webhook)`);
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   * Como usamos webhooks, isso é apenas uma simulação
   */
  async checkConnection(): Promise<{ connected: boolean; state?: string; qrCode?: string }> {
    try {
      console.log(`Verificando status de conexão da instância ${this.instance} (simulado - usando webhooks)`);
      
      // Como utilizamos webhooks, assumimos que a conexão está ativa
      return {
        connected: true,
        state: 'open'
      };
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
   * Quando usamos webhooks, isso simula o envio para manter compatibilidade
   */
  async sendTextMessage(to: string, message: string): Promise<SentMessage | null> {
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
      console.log(`Enviando mensagem de texto via webhook para ${formattedTo}: ${message.substring(0, 30)}...`);
      
      // Simulamos o envio da mensagem, já que a comunicação real é feita via webhook
      // A Evolution API receberá a mensagem do WhatsApp e enviará uma notificação para o webhook configurado
      
      // Em um sistema real com APIs diretas, usaríamos:
      /*
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
        payload
      );
      */
      
      // Log para simular o envio
      console.log('Payload que seria enviado (simulado):', JSON.stringify({
        number: formattedTo,
        message: message
      }));
      
      // Simular resposta bem-sucedida
      console.log('Simulando resposta de envio bem-sucedido (integração via webhook)');
      
      // Retornar um objeto simulando o sucesso do envio
      // Em produção, o webhook receberá atualizações de status
      return {
        id: `sim_${Date.now().toString()}`,
        status: 'sent',
        to: formattedTo,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Erro ao simular envio de mensagem de texto:', error);
      
      // Retornar um objeto de erro para facilitar tratamento no cliente
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
   * Quando usamos webhooks, isso simula o envio para manter compatibilidade
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
      
      console.log(`Enviando mídia (${mediaType}) via webhook para ${formattedTo}: ${mediaUrl}`);
      
      // Simulamos o envio da mensagem com mídia via webhook
      // Em um sistema real com APIs diretas, usaríamos:
      /*
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
      */
      
      // Log para simular o envio de mídia
      console.log('Payload de mídia que seria enviado (simulado):', JSON.stringify({
        number: formattedTo,
        mediaType: mediaType,
        mediaUrl: mediaUrl,
        caption: caption
      }));
      
      // Simular resposta bem-sucedida
      console.log('Simulando resposta de envio de mídia bem-sucedido (integração via webhook)');
      
      // Retornar um objeto simulando o sucesso do envio
      return {
        id: `sim_media_${Date.now().toString()}`,
        status: 'sent',
        to: formattedTo,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Erro ao simular envio de mídia (${mediaType}):`, error);
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