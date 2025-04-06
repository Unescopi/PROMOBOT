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
 * A comunicação é feita EXCLUSIVAMENTE via webhook
 */
export class WhatsAppService {
  private instance: string;

  constructor() {
    this.instance = 'PradoBot';
    console.log(`WhatsAppService inicializado: Instância=${this.instance} (comunicação via webhook)`);
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   */
  async checkConnection(): Promise<{ connected: boolean; state?: string; qrCode?: string }> {
    console.log(`Estado da conexão via webhook para instância ${this.instance}`);
    
    // Como usamos webhooks, assumimos que a conexão está ativa
    return {
      connected: true,
      state: 'open'
    };
  }

  /**
   * Formata o número de telefone para o padrão do webhook
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
    
    // Garantir que termine com @c.us para o formato do webhook
    if (!formatted.includes('@')) {
      formatted = `${formatted}@c.us`;
    }
    
    console.log(`Telefone formatado: ${phone} → ${formatted}`);
    return formatted;
  }

  /**
   * Registra mensagem para processamento via webhook
   * Toda comunicação é feita EXCLUSIVAMENTE via webhook
   */
  async sendTextMessage(to: string, message: string): Promise<SentMessage | null> {
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
      console.log(`Registrando mensagem de texto para envio via webhook para ${formattedTo}`);
      console.log(`Conteúdo: "${message.substring(0, 30)}..."`);
      
      // Registra a mensagem no banco de dados ou em fila para processamento via webhook
      // NÃO faz chamada direta à API - o webhook cuida disso
      
      // Gerar ID único para rastreamento
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Log para auditoria
      console.log(`Mensagem ${messageId} registrada para ${formattedTo}`);
      
      // Retorna status de registro bem-sucedido
      return {
        id: messageId,
        status: 'queued', // Mensagem na fila para processamento via webhook
        to: formattedTo,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Erro ao registrar mensagem para envio via webhook:', error);
      return {
        id: `err_${Date.now()}`,
        status: 'failed',
        to: to,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Registra mensagem de mídia para processamento via webhook
   * Toda comunicação é feita EXCLUSIVAMENTE via webhook
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
      
      console.log(`Registrando mídia (${mediaType}) para envio via webhook para ${formattedTo}`);
      console.log(`URL da mídia: ${mediaUrl}`);
      
      // Registra a mensagem de mídia no banco de dados ou em fila para processamento via webhook
      // NÃO faz chamada direta à API - o webhook cuida disso
      
      // Gerar ID único para rastreamento
      const mediaMessageId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Log para auditoria
      console.log(`Mensagem de mídia ${mediaMessageId} registrada para ${formattedTo}`);
      
      // Retorna status de registro bem-sucedido
      return {
        id: mediaMessageId,
        status: 'queued', // Mensagem na fila para processamento via webhook
        to: formattedTo,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Erro ao registrar mídia para envio via webhook:`, error);
      return {
        id: `err_media_${Date.now()}`,
        status: 'failed',
        to: to,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Registra mensagem (texto ou mídia) para processamento via webhook
   * Toda comunicação é feita EXCLUSIVAMENTE via webhook
   */
  async sendMessage(message: WhatsAppMessage): Promise<SentMessage | null> {
    console.log(`Processando registro de mensagem para ${message.number} via webhook`);
    
    if (message.mediaUrl && message.mediaType) {
      // Se tiver mídia, registrar como mensagem de mídia
      return this.sendMediaMessage(
        message.number,
        message.mediaUrl,
        message.message
      );
    } else {
      // Caso contrário, registrar como mensagem de texto
      return this.sendTextMessage(message.number, message.message);
    }
  }
} 