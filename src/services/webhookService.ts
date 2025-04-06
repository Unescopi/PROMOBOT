import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import ContatoSimplesModel from '@/models/ContatoSimples';

// Interface para resposta do webhook
interface WebhookResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Interface para mensagem recebida da EvolutionAPI
interface EvolutionWebhookMessage {
  instance: string;
  messageType: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  isGroup: boolean;
  mediaType?: string;
  mediaUrl?: string;
  caption?: string;
  mimetype?: string;
  filename?: string;
  // Outros campos que podem vir da EvolutionAPI
}

// Interface para detalhes de entrega
interface MessageDeliveryStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  to: string;
  from?: string;
  timestamp: number;
}

// Interface para estado de conexão
interface ConnectionStatus {
  instance: string;
  state: 'open' | 'connecting' | 'closed' | 'disconnected' | 'requiresQrCode';
  qrcode?: string;
  timestamp: number;
}

/**
 * Serviço para manipulação do webhook da EvolutionAPI
 */
export const WebhookService = {
  /**
   * Processa mensagens recebidas via webhook da EvolutionAPI
   */
  processIncomingMessage: async (message: EvolutionWebhookMessage): Promise<WebhookResponse> => {
    try {
      // Verificar se é uma mensagem válida
      if (!message || !message.from || !message.content) {
        return {
          success: false,
          message: 'Dados de mensagem inválidos'
        };
      }
      
      console.log('Mensagem recebida via webhook:', message);
      
      // Conectar ao banco de dados
      await connectToDatabase();
      
      // Extrair número do telefone (removendo o @c.us se presente)
      const phoneNumber = message.from.replace('@c.us', '');
      
      // Verificar se o contato existe no banco
      let contato = await ContatoSimplesModel.findOne({ telefone: phoneNumber });
      
      // Se não existir, criar um novo contato
      if (!contato) {
        contato = new ContatoSimplesModel({
          nome: `Desconhecido (${phoneNumber})`,
          telefone: phoneNumber,
          criadoEm: new Date()
        });
        await contato.save();
        console.log(`Novo contato criado: ${phoneNumber}`);
      } else {
        // Atualizar data de atualização
        contato.atualizadoEm = new Date();
        await contato.save();
      }
      
      // Salvar a mensagem no banco de dados
      await saveMessageToDatabase(message);
      
      // Verificar se é uma mensagem que precisa de resposta automática
      if (message.messageType === 'text' && !message.isGroup) {
        const content = message.content.toLowerCase();
        
        // Exemplo de lógica para resposta automática
        if (content.includes('ajuda') || content.includes('help')) {
          // Enviar resposta automática aqui (implementar integração com WhatsAppService)
          return {
            success: true,
            message: 'Mensagem processada com resposta automática',
            data: { autoReply: true, keyword: 'ajuda' }
          };
        }
      }
      
      return {
        success: true,
        message: 'Mensagem processada com sucesso',
        data: { contactId: contato._id }
      };
    } catch (error) {
      console.error('Erro ao processar mensagem do webhook:', error);
      return {
        success: false,
        message: 'Erro ao processar mensagem do webhook',
        data: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      };
    }
  },
  
  /**
   * Atualiza o status de entrega de uma mensagem
   */
  updateMessageStatus: async (delivery: MessageDeliveryStatus): Promise<WebhookResponse> => {
    try {
      // Verificar se os dados de status são válidos
      if (!delivery || !delivery.id || !delivery.status) {
        return {
          success: false,
          message: 'Dados de status inválidos'
        };
      }
      
      console.log('Status de entrega recebido:', delivery);
      
      // Conectar ao banco de dados
      await connectToDatabase();
      
      // Em uma implementação real, atualizaríamos o status da mensagem no banco de dados
      // Exemplo de código para atualizar em um modelo de Mensagem (que precisaria ser criado)
      /*
      const mensagem = await MensagemModel.findOne({ messageId: delivery.id });
      if (mensagem) {
        mensagem.status = delivery.status;
        mensagem.dataAtualizacao = new Date(delivery.timestamp);
        await mensagem.save();
      }
      */
      
      // Registrar o evento de status em um log ou histórico
      await logMessageStatus(delivery);
      
      return {
        success: true,
        message: 'Status de mensagem atualizado com sucesso',
        data: { status: delivery.status }
      };
    } catch (error) {
      console.error('Erro ao atualizar status da mensagem:', error);
      return {
        success: false,
        message: 'Erro ao atualizar status da mensagem',
        data: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      };
    }
  },
  
  /**
   * Processa eventos de conexão de dispositivo
   */
  handleDeviceConnection: async (connection: ConnectionStatus): Promise<WebhookResponse> => {
    try {
      // Verificar se os dados de conexão são válidos
      if (!connection || !connection.instance || !connection.state) {
        return {
          success: false,
          message: 'Dados de conexão inválidos'
        };
      }
      
      console.log('Status de conexão recebido:', connection);
      
      // Registrar o evento de conexão
      await logConnectionStatus(connection);
      
      // Se houver QR Code, podemos armazená-lo para exibição na interface
      if (connection.state === 'requiresQrCode' && connection.qrcode) {
        // Armazenar QR Code temporariamente para exibição na interface
        // Em uma implementação real, poderíamos usar Redis ou outro mecanismo
        // para armazenar dados temporários
      }
      
      return {
        success: true,
        message: `Conexão processada: ${connection.state}`,
        data: { state: connection.state }
      };
    } catch (error) {
      console.error('Erro ao processar conexão de dispositivo:', error);
      return {
        success: false,
        message: 'Erro ao processar conexão de dispositivo',
        data: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      };
    }
  },
  
  /**
   * Verifica se o webhook está autenticado corretamente
   */
  validateWebhook: (token: string | null, secretKey: string): boolean => {
    // Verificar se o token está presente e corresponde à chave secreta configurada
    if (!token) {
      return false;
    }
    
    // Em um cenário real, usaríamos uma comparação segura ou uma assinatura HMAC
    return token === secretKey;
  }
};

// Função auxiliar para salvar mensagem no banco de dados
async function saveMessageToDatabase(message: EvolutionWebhookMessage) {
  try {
    // Conectar ao banco de dados se ainda não estiver conectado
    if (mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
    
    // Em uma implementação real, usaríamos um modelo específico para Mensagens
    // Exemplo de código:
    /*
    const novaMensagem = new MensagemModel({
      from: message.from.replace('@c.us', ''),
      to: message.to.replace('@c.us', ''),
      content: message.content,
      type: message.messageType,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      timestamp: new Date(message.timestamp),
      isGroup: message.isGroup,
      status: 'received'
    });
    
    await novaMensagem.save();
    */
    
    console.log('Mensagem salva no banco de dados:', {
      from: message.from,
      content: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
      type: message.messageType,
      time: new Date(message.timestamp).toISOString()
    });
  } catch (error) {
    console.error('Erro ao salvar mensagem no banco de dados:', error);
    throw error;
  }
}

// Função auxiliar para registrar status de mensagem
async function logMessageStatus(status: MessageDeliveryStatus) {
  try {
    console.log('Registrando status da mensagem:', {
      id: status.id,
      status: status.status,
      to: status.to,
      time: new Date(status.timestamp).toISOString()
    });
    
    // Em uma implementação real, armazenaríamos em um log ou no banco de dados
  } catch (error) {
    console.error('Erro ao registrar status da mensagem:', error);
    throw error;
  }
}

// Função auxiliar para registrar status de conexão
async function logConnectionStatus(connection: ConnectionStatus) {
  try {
    console.log('Registrando status de conexão:', {
      instance: connection.instance,
      state: connection.state,
      time: new Date(connection.timestamp).toISOString()
    });
    
    // Em uma implementação real, armazenaríamos em um log ou no banco de dados
  } catch (error) {
    console.error('Erro ao registrar status de conexão:', error);
    throw error;
  }
}

/**
 * Rota principal para receber webhooks da Evolution API
 * Em Next.js, esta lógica seria implementada em uma rota API
 * Exemplo: app/api/webhook/route.ts
 */
export async function handleWebhook(req: any, res: any) {
  try {
    const data = req.body;
    
    // Identificar o tipo de evento recebido
    if (data.event === 'message') {
      await WebhookService.processIncomingMessage(data.message);
    } else if (data.event === 'status') {
      await WebhookService.updateMessageStatus(data.status);
    } else if (data.event === 'connection') {
      await WebhookService.handleDeviceConnection(data.connection);
    }
    
    return {
      success: true,
      message: 'Webhook processado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return {
      success: false,
      message: 'Erro ao processar webhook'
    };
  }
} 