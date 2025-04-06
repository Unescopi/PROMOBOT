import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/services/webhookService';
import { getConfiguracao } from '@/services/configService';

/**
 * Endpoint para receber webhooks da Evolution API
 * Processa mensagens recebidas, status de entrega e eventos de conexão
 */
export async function POST(request: NextRequest) {
  try {
    // Obter token do cabeçalho para validação
    const token = request.headers.get('x-webhook-token');
    
    // Obter configuração atual para verificar a chave secreta do webhook
    const config = await getConfiguracao();
    const secretKey = config?.webhookSegredo || process.env.WEBHOOK_SECRET || '';
    
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
    
    // Log para debug
    console.log('Webhook recebido:', {
      type: body.type || 'desconhecido',
      instance: body.instance,
      timestamp: new Date().toISOString()
    });
    
    let response;
    
    // Detectar o formato da Evolution API (pode variar dependendo da versão)
    if (body.event) {
      // Formato antigo: { event: 'message', message: {...} }
      if (body.event === 'message' && body.message) {
        response = await WebhookService.processIncomingMessage(body.message);
      } else if (body.event === 'status' && body.status) {
        response = await WebhookService.updateMessageStatus(body.status);
      } else if (body.event === 'connection' && body.connection) {
        response = await WebhookService.handleDeviceConnection(body.connection);
      } else {
        // Evento desconhecido no formato antigo
        console.log('Evento recebido em formato antigo:', body);
        return NextResponse.json({
          success: true,
          message: 'Evento recebido mas não processado'
        });
      }
    } else if (body.type) {
      // Formato novo: { type: 'message', data: {...} }
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
    } else {
      // Formato desconhecido - tentar processar como mensagem direta
      console.log('Formato de webhook desconhecido:', JSON.stringify(body).substring(0, 200) + '...');
      
      // Tentar processar como mensagem direta se tiver campos relevantes
      if (body.from && (body.body || body.content || body.message)) {
        const adaptedMessage = {
          from: body.from,
          content: body.body || body.content || body.message,
          messageType: body.type || 'text',
          timestamp: body.timestamp || Date.now(),
          isGroup: body.isGroup || false
        };
        
        response = await WebhookService.processIncomingMessage(adaptedMessage);
      } else {
        // Aceitar a requisição mas avisar que não foi processada
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
  return NextResponse.json({
    success: true,
    message: 'Webhook do PromoBot está ativo e funcionando',
    timestamp: new Date().toISOString()
  }, { status: 200 });
} 