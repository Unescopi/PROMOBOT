import axios from 'axios';
import mongoose, { Collection } from 'mongoose';

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

// Interface para mensagem no formato do webhook da Evolution API
export interface EvolutionWebhookMessage {
  instance: string;
  messageType: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  isGroup: boolean;
  mediaUrl?: string;
}

/**
 * Serviço para integração com WhatsApp via Evolution API
 * A comunicação é feita EXCLUSIVAMENTE via webhook
 */
export class WhatsAppService {
  private instance: string;
  
  // Coleção para armazenar mensagens pendentes para envio via webhook
  private pendingMessages: EvolutionWebhookMessage[] = [];
  private messagesCollection: any = null;

  constructor() {
    this.instance = 'PradoBot';
    console.log(`WhatsAppService inicializado: Instância=${this.instance} (comunicação EXCLUSIVAMENTE via webhook)`);
    
    // Inicializar conexão com o banco de dados para mensagens pendentes
    this.initMessagesCollection();
  }
  
  /**
   * Inicializa a coleção para armazenar mensagens pendentes
   */
  private async initMessagesCollection() {
    try {
      if (mongoose.connection.readyState === 1) { // Já conectado
        if (mongoose.connection.db) {
          this.messagesCollection = mongoose.connection.db.collection('pendingMessages');
          console.log('Coleção de mensagens pendentes inicializada com sucesso');
        } else {
          console.log('Conexão MongoDB não tem uma base de dados associada');
        }
      } else {
        console.log('Conexão MongoDB não está pronta. Mensagens serão armazenadas temporariamente na memória.');
      }
    } catch (error) {
      console.error('Erro ao inicializar coleção de mensagens pendentes:', error);
    }
  }

  /**
   * Verifica o status da conexão com o WhatsApp
   * No modelo de webhook, apenas retornamos o status presumido
   */
  async checkConnection(): Promise<{ connected: boolean; state?: string; qrCode?: string }> {
    console.log(`Estado da conexão via webhook para instância ${this.instance}`);
    
    // No modelo de webhook, presumimos que a conexão está ativa
    return {
      connected: true,
      state: 'open'
    };
  }

  /**
   * Formata o número de telefone para o padrão EXATO do webhook Evolution API
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
    
    // Adicionar o formato EXATO recebido da Evolution API: @s.whatsapp.net
    if (!formatted.includes('@')) {
      formatted = `${formatted}@s.whatsapp.net`;
    }
    
    console.log(`Telefone formatado: ${phone} → ${formatted}`);
    return formatted;
  }

  /**
   * Registra uma mensagem de texto para envio via webhook
   * Usa o MESMO formato que recebemos da Evolution API
   */
  async sendTextMessage(to: string, message: string): Promise<SentMessage | null> {
    try {
      // Formatar o número do destinatário
      const formattedTo = this.formatPhoneNumber(to);
      
      console.log(`Registrando mensagem de texto para ${formattedTo}: ${message.substring(0, 30)}...`);
      
      // Criar mensagem no MESMO formato que recebemos da Evolution API
      const evolutionMessage: EvolutionWebhookMessage = {
        instance: this.instance,
        messageType: 'text',
        from: this.instance,
        to: formattedTo,
        content: message,
        timestamp: Date.now(),
        isGroup: false
      };
      
      // Armazenar a mensagem para processamento
      await this.storePendingMessage(evolutionMessage);
      
      console.log(`Mensagem registrada no formato Evolution API para ${formattedTo}`);
      
      // Retornar status de enfileiramento bem-sucedido
      return {
        id: `msg_${Date.now()}`,
        status: 'queued',
        to: formattedTo,
        timestamp: evolutionMessage.timestamp
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
   * Registra uma mensagem de mídia para envio via webhook
   * Usa o MESMO formato que recebemos da Evolution API
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
      
      // Converter URL relativa para absoluta se necessário
      if (mediaUrl.startsWith('/')) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        mediaUrl = `${baseUrl}${mediaUrl}`;
        console.log(`URL de mídia convertida para absoluta: ${mediaUrl}`);
      }
      
      console.log(`Registrando mídia (${mediaType}) para ${formattedTo}: ${mediaUrl}`);
      
      // Criar mensagem no MESMO formato que recebemos da Evolution API
      const evolutionMessage: EvolutionWebhookMessage = {
        instance: this.instance,
        messageType: mediaType,
        from: this.instance,
        to: formattedTo,
        content: caption,
        timestamp: Date.now(),
        isGroup: false,
        mediaUrl: mediaUrl
      };
      
      // Armazenar a mensagem para processamento
      await this.storePendingMessage(evolutionMessage);
      
      console.log(`Mensagem de mídia registrada no formato Evolution API para ${formattedTo}`);
      
      // Retornar status de enfileiramento bem-sucedido
      return {
        id: `media_${Date.now()}`,
        status: 'queued',
        to: formattedTo,
        timestamp: evolutionMessage.timestamp
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
   * Armazena uma mensagem pendente para processamento pelo webhook
   */
  private async storePendingMessage(message: EvolutionWebhookMessage): Promise<void> {
    try {
      // Se temos acesso ao MongoDB, armazenar lá
      if (this.messagesCollection) {
        await this.messagesCollection.insertOne({
          ...message,
          status: 'pending',
          createdAt: new Date()
        });
        console.log('Mensagem armazenada no MongoDB para processamento via webhook');
      } else {
        // Caso contrário, armazenar na memória
        this.pendingMessages.push(message);
        console.log('Mensagem armazenada na memória para processamento via webhook');
      }
    } catch (error) {
      console.error('Erro ao armazenar mensagem pendente:', error);
      // Em caso de erro no MongoDB, armazenar na memória como fallback
      this.pendingMessages.push(message);
    }
  }
  
  /**
   * Obtém mensagens pendentes para processamento
   * Este método pode ser chamado pelo webhook para obter mensagens para envio
   */
  async getPendingMessages(): Promise<EvolutionWebhookMessage[]> {
    try {
      if (this.messagesCollection) {
        const messages = await this.messagesCollection
          .find({ status: 'pending' })
          .limit(10)
          .toArray();
          
        console.log(`Recuperadas ${messages.length} mensagens pendentes do MongoDB`);
        return messages as unknown as EvolutionWebhookMessage[];
      } else {
        console.log(`Recuperadas ${this.pendingMessages.length} mensagens pendentes da memória`);
        return [...this.pendingMessages];
      }
    } catch (error) {
      console.error('Erro ao obter mensagens pendentes:', error);
      return [...this.pendingMessages];
    }
  }
  
  /**
   * Marca uma mensagem como processada
   */
  async markMessageAsProcessed(messageId: number): Promise<void> {
    try {
      if (this.messagesCollection) {
        await this.messagesCollection.updateOne(
          { timestamp: messageId },
          { $set: { status: 'processed', processedAt: new Date() } }
        );
        console.log(`Mensagem ${messageId} marcada como processada no MongoDB`);
      } else {
        // Remover da lista em memória
        const index = this.pendingMessages.findIndex(msg => msg.timestamp === messageId);
        if (index >= 0) {
          this.pendingMessages.splice(index, 1);
          console.log(`Mensagem ${messageId} removida da lista em memória`);
        }
      }
    } catch (error) {
      console.error(`Erro ao marcar mensagem ${messageId} como processada:`, error);
    }
  }

  /**
   * Envia mensagem via WhatsApp (texto ou mídia)
   * Este método apenas registra a mensagem para processamento via webhook no formato Evolution API
   */
  async sendMessage(message: WhatsAppMessage): Promise<SentMessage | null> {
    console.log(`Registrando mensagem para ${message.number} para processamento via webhook`);
    
    if (message.mediaUrl && message.mediaType) {
      // Se tiver mídia, registrar como mensagem de mídia
      return this.sendMediaMessage(
        message.number,
        message.mediaUrl,
        message.message,
        message.mediaType
      );
    } else {
      // Caso contrário, registrar como mensagem de texto
      return this.sendTextMessage(message.number, message.message);
    }
  }
} 