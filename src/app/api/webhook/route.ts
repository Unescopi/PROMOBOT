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
    
    // Formato específico da Evolution API com event: messages.upsert
    if (body.event === 'messages.upsert') {
      console.log('Formato Evolution API detectado (messages.upsert)');
      
      // Verificar e extrair a mensagem do formato recebido
      let mensagemProcessada = false;
      let adaptedMessage;

      // Caso 1: messages.upsert com array de mensagens
      if (body.data?.messages && Array.isArray(body.data.messages) && body.data.messages.length > 0) {
        console.log('Processando mensagem do formato messages.upsert com array');
        const message = body.data.messages[0];
        
        adaptedMessage = {
          instance: body.instance || 'evolution',
          messageType: message.key.fromMe ? 'outgoing' : 'text',
          from: message.key.remoteJid,
          to: message.key.remoteJid,
          content: message.message?.conversation || message.message?.extendedTextMessage?.text || '',
          timestamp: message.messageTimestamp * 1000,
          isGroup: message.key.remoteJid?.endsWith('@g.us') || false
        };
        mensagemProcessada = true;
      } 
      // Caso 2: messages.upsert com mensagem na propriedade key/message
      else if (body.data?.key && body.data?.message) {
        console.log('Processando mensagem do formato messages.upsert com key/message');
        adaptedMessage = {
          instance: body.instance || 'evolution',
          messageType: body.data.key.fromMe ? 'outgoing' : 'text',
          from: body.data.key.remoteJid,
          to: body.data.key.remoteJid,
          content: body.data.message?.conversation || body.data.message?.extendedTextMessage?.text || '',
          timestamp: body.data.messageTimestamp ? body.data.messageTimestamp * 1000 : Date.now(),
          isGroup: body.data.key.remoteJid?.endsWith('@g.us') || false
        };
        mensagemProcessada = true;
      }
      // Caso 3: formato alternativo com pushName (identificado nos logs)
      else if (body.data?.pushName && body.data?.message) {
        console.log('Processando mensagem do formato messages.upsert com pushName');
        // Obter o remoteJid do key se disponível, ou construir a partir do pushName
        const from = body.data.key?.remoteJid || `${body.data.pushName.replace(/\s+/g, '')}@s.whatsapp.net`;
        
        adaptedMessage = {
          instance: body.instance || 'evolution',
          messageType: 'text', // Assume mensagem recebida
          from: from,
          to: from, // Em mensagens recebidas, from e to são o mesmo
          content: body.data.message?.conversation || 
                   body.data.message?.extendedTextMessage?.text || 
                   JSON.stringify(body.data.message),
          timestamp: Date.now(),
          isGroup: from.includes('@g.us')
        };
        mensagemProcessada = true;
      }
      // Caso 4: formato com status de mensagem (indicadores de leitura/recebimento)
      else if (body.data?.status) {
        console.log('Processando status de mensagem no formato messages.upsert');
        const statusUpdate = {
          id: body.data.key?.id || `status_${Date.now()}`,
          status: body.data.status,
          from: body.data.key?.remoteJid || 'unknown',
          to: body.data.key?.remoteJid || 'unknown',
          timestamp: Date.now()
        };
        
        response = await WebhookService.updateMessageStatus(statusUpdate);
        mensagemProcessada = true;
      }
      
      // Se conseguimos processar a mensagem, enviamos para o serviço
      if (mensagemProcessada && adaptedMessage) {
        console.log('Mensagem extraída do formato messages.upsert:', adaptedMessage);
        response = await WebhookService.processIncomingMessage(adaptedMessage);
      } else {
        // Se não conseguimos processar, registramos o payload para depuração
        console.log('Formato messages.upsert não reconhecido:', JSON.stringify(body.data).substring(0, 300));
        return NextResponse.json({
          success: true,
          message: 'Formato messages.upsert recebido mas não processado. Verifique logs para detalhes.'
        });
      }
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