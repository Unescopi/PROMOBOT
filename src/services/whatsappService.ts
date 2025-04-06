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
 * A Evolution API já está configurada na VPS e a comunicação é feita EXCLUSIVAMENTE via webhook
 * Este serviço apenas SIMULA o envio de mensagens para manter a compatibilidade com o resto do sistema
 */
export class WhatsAppService {
  private instance: string;

  constructor() {
    // A integração é feita EXCLUSIVAMENTE via webhook - não fazemos chamadas diretas à API
    this.instance = 'PradoBot';
    console.log(`WhatsAppService inicializado: Instância=${this.instance} (comunicação EXCLUSIVAMENTE via webhook)`);
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   * Como usamos apenas webhooks, isso é apenas uma simulação
   */
  async checkConnection(): Promise<{ connected: boolean; state?: string; qrCode?: string }> {
    console.log(`Verificando status de conexão da instância ${this.instance} (SIMULADO - apenas webhooks)`);
    
    // Como utilizamos webhooks, assumimos que a conexão está ativa
    return {
      connected: true,
      state: 'open'
    };
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
    
    // Garantir que termine com @c.us para o formato esperado no webhook
    if (!formatted.includes('@')) {
      formatted = `${formatted}@c.us`;
    }
    
    console.log(`Telefone formatado: ${phone} → ${formatted}`);
    return formatted;
  }

  /**
   * SIMULA o envio de mensagem de texto via WhatsApp
   * IMPORTANTE: NÃO faz chamadas HTTP diretas à Evolution API
   * Toda comunicação é feita exclusivamente via webhook
   */
  async sendTextMessage(to: string, message: string): Promise<SentMessage | null> {
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
      console.log(`[SIMULAÇÃO] Enviando mensagem de texto para ${formattedTo}: ${message.substring(0, 30)}...`);
      console.log(`[WEBHOOK ONLY] Comunicação real ocorre apenas via webhook. Esta é uma simulação para fins de compatibilidade.`);
      
      // Log para simular o envio - NÃO fazemos chamadas HTTP à API
      console.log('[SIMULAÇÃO] Mensagem que seria enviada:', {
        destinatario: formattedTo,
        mensagem: message
      });
      
      // Simular resposta bem-sucedida
      console.log('[SIMULAÇÃO] Simulando resposta de envio bem-sucedido (webhook only)');
      
      // Retornar um objeto simulando o sucesso do envio
      return {
        id: `sim_${Date.now().toString()}`,
        status: 'sent',
        to: formattedTo,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[SIMULAÇÃO] Erro ao simular envio de mensagem de texto:', error);
      
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
   * SIMULA o envio de mensagem de mídia via WhatsApp
   * IMPORTANTE: NÃO faz chamadas HTTP diretas à Evolution API
   * Toda comunicação é feita exclusivamente via webhook
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
      
      console.log(`[SIMULAÇÃO] Enviando mídia (${mediaType}) para ${formattedTo}: ${mediaUrl}`);
      console.log(`[WEBHOOK ONLY] Comunicação real ocorre apenas via webhook. Esta é uma simulação para fins de compatibilidade.`);
      
      // Log para simular o envio de mídia - NÃO fazemos chamadas HTTP à API
      console.log('[SIMULAÇÃO] Mídia que seria enviada:', {
        destinatario: formattedTo,
        tipoMidia: mediaType,
        urlMidia: mediaUrl,
        legenda: caption
      });
      
      // Simular resposta bem-sucedida
      console.log('[SIMULAÇÃO] Simulando resposta de envio de mídia bem-sucedido (webhook only)');
      
      // Retornar um objeto simulando o sucesso do envio
      return {
        id: `sim_media_${Date.now().toString()}`,
        status: 'sent',
        to: formattedTo,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`[SIMULAÇÃO] Erro ao simular envio de mídia (${mediaType}):`, error);
      return {
        id: `err_media_${Date.now().toString()}`,
        status: 'failed',
        to: to,
        timestamp: Date.now()
      };
    }
  }

  /**
   * SIMULA o envio de mensagem via WhatsApp (texto ou mídia)
   * IMPORTANTE: NÃO faz chamadas HTTP diretas à Evolution API
   * Esta função define se é para enviar texto ou mídia, mas ambos são apenas simulados
   */
  async sendMessage(message: WhatsAppMessage): Promise<SentMessage | null> {
    console.log(`[SIMULAÇÃO] Processando envio de mensagem para ${message.number}`);
    
    if (message.mediaUrl && message.mediaType) {
      // Se tiver mídia, simular envio como mensagem de mídia
      return this.sendMediaMessage(
        message.number,
        message.mediaUrl,
        message.message
      );
    } else {
      // Caso contrário, simular envio como mensagem de texto
      return this.sendTextMessage(message.number, message.message);
    }
  }
} 