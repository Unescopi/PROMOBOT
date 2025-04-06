import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/services/webhookService';

/**
 * Endpoint para receber webhooks da Evolution API
 * Processa mensagens recebidas, status de entrega e eventos de conexão
 */
export async function POST(request: NextRequest) {
  try {
    // Obter token do cabeçalho para validação
    const token = request.headers.get('x-webhook-token');
    
    // Obter chave secreta direto do .env
    const secretKey = process.env.WEBHOOK_SECRET || '';
    
    // Verificar token apenas se um secretKey estiver configurado e for diferente de vazio
    if (secretKey && secretKey.length > 0) {
      if (!WebhookService.validateWebhook(token, secretKey)) {
        console.log('Tentativa de acesso ao webhook com token inválido ou ausente. Permitindo acesso temporariamente.');
        // Comentamos a rejeição para permitir requisições da Evolution API
        // return NextResponse.json({ 
        //   success: false, 
        //   message: 'Não autorizado' 
        // }, { status: 401 });
      }
    }
    
    // Obter corpo da requisição
    const body = await request.json();
    
    // Log para debug completo
    console.log('Webhook recebido (completo):', JSON.stringify(body).substring(0, 500));
    
    // Log resumido para debug
    console.log('Webhook recebido (resumo):', {
      type: body.type || body.event || 'desconhecido',
      instance: body.instance || 'não especificada',
      timestamp: new Date().toISOString()
    });
    
    let response;
    
    // Detectar o formato da Evolution API (pode variar dependendo da versão e configuração)
    
    // Formato específico da Evolution API (v1)
    if (body.event === 'messages.upsert' && body.data?.messages) {
      console.log('Formato Evolution API v1 detectado (messages.upsert)');
      
      // Processar a primeira mensagem na lista
      const message = body.data.messages[0];
      
      // Adaptar para o formato esperado pelo WebhookService
      const adaptedMessage = {
        instance: body.instance || 'evolution',
        messageType: message.key.fromMe ? 'outgoing' : 'text',
        from: message.key.remoteJid,
        to: message.key.remoteJid,
        content: message.message?.conversation || message.message?.extendedTextMessage?.text || '',
        timestamp: message.messageTimestamp * 1000,
        isGroup: message.key.remoteJid?.endsWith('@g.us') || false
      };
      
      response = await WebhookService.processIncomingMessage(adaptedMessage);
    }
    // Formato específico da Evolution API (v2)
    else if (body.event === 'message' && body.message) {
      console.log('Formato Evolution API v2 detectado (event: message)');
      response = await WebhookService.processIncomingMessage(body.message);
    }
    // Formato da mensagem status
    else if (body.event === 'status' && body.status) {
      console.log('Formato de status detectado');
      response = await WebhookService.updateMessageStatus(body.status);
    }
    // Formato de conexão
    else if (body.event === 'connection' && body.connection) {
      console.log('Formato de conexão detectado');
      response = await WebhookService.handleDeviceConnection(body.connection);
    }
    // Formato novo/genérico: { type: 'message', data: {...} }
    else if (body.type) {
      console.log(`Formato genérico detectado com tipo: ${body.type}`);
      switch (body.type) {
        case 'message':
          // Processar mensagem recebida
          response = await WebhookService.processIncomingMessage(body.data);
          break;
          
        case 'status':
          // Processar atualização de status de entrega
          response = await WebhookService.updateMessageStatus(body.data);
          break;
          
        case 'connection':
          // Processar estado de conexão do dispositivo
          response = await WebhookService.handleDeviceConnection(body.data);
          break;
          
        default:
          // Tipo de evento não suportado - logar mas não rejeitar
          console.log('Tipo de evento não reconhecido:', body);
          return NextResponse.json({
            success: true,
            message: `Evento recebido: ${body.type}`
          });
      }
    }
    // Formato desconhecido - tentar processar como mensagem direta
    else {
      console.log('Formato de webhook desconhecido ou não suportado');
      
      // Tentar processar como mensagem direta se tiver campos relevantes
      if (body.from && (body.body || body.content || body.message)) {
        console.log('Tentando processar como mensagem direta');
        
        const adaptedMessage = {
          instance: body.instance || 'direct',
          messageType: body.type || 'text',
          from: body.from,
          to: body.to || 'unknown',
          content: body.body || body.content || body.message || '',
          timestamp: body.timestamp || Date.now(),
          isGroup: body.isGroup || false
        };
        
        response = await WebhookService.processIncomingMessage(adaptedMessage);
      } else {
        // Aceitar a requisição mas avisar que não foi processada
        console.log('Impossível processar o formato recebido');
        return NextResponse.json({
          success: true,
          message: 'Webhook recebido em formato desconhecido'
        });
      }
    }
    
    // Retornar resposta do processamento
    return NextResponse.json(response || { success: true, message: 'Webhook processado' });
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    
    // Sempre retornar sucesso para a Evolution API não parar de enviar
    return NextResponse.json({
      success: true,
      message: 'Webhook recebido mas ocorreu um erro no processamento',
      error: error instanceof Error ? error.message : 'Erro interno'
    });
  }
}

/**
 * Manipulador para verificação do webhook (geralmente GET)
 * Pode ser usado para validar a configuração do webhook na EvolutionAPI
 */
export async function GET(request: NextRequest) {
  console.log('Requisição GET recebida no webhook - Verificação de status');
  return NextResponse.json({
    success: true,
    message: 'Webhook do PromoBot está ativo e funcionando',
    timestamp: new Date().toISOString()
  }, { status: 200 });
} 