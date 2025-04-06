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
    
    // Validar autenticação do webhook
    if (!WebhookService.validateWebhook(token, secretKey)) {
      console.error('Tentativa de acesso ao webhook com token inválido');
      return NextResponse.json({ 
        success: false, 
        message: 'Não autorizado' 
      }, { status: 401 });
    }
    
    // Obter corpo da requisição
    const body = await request.json();
    
    // Log para debug
    console.log('Webhook recebido:', {
      type: body.type,
      instance: body.instance,
      timestamp: new Date().toISOString()
    });
    
    let response;
    
    // Processar diferentes tipos de eventos
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
        // Tipo de evento não suportado
        return NextResponse.json({
          success: false,
          message: `Tipo de evento não suportado: ${body.type}`
        }, { status: 400 });
    }
    
    // Retornar resposta do processamento
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar webhook',
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
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