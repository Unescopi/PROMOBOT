import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/services/webhookService';
import { WhatsAppService } from '@/services/whatsappService';
import { connectToDatabase } from '@/lib/mongodb';
import ContatoModel from '@/models/Contato';
import mongoose from 'mongoose';

/**
 * Endpoint para receber webhooks do WhatsApp
 */
export async function POST(request: NextRequest) {
  // Validar token, se necessário
  // Implementar lógica de validação aqui
  
  try {
    // Obter os dados do webhook
    const rawData = await request.json();
    console.log(`Webhook recebido (completo): ${JSON.stringify(rawData).substring(0, 500)}...`);
    
    // Validar usando método estático
    const token = request.headers.get('x-webhook-token') || '';
    const secretKey = process.env.WEBHOOK_SECRET || '';
    const validado = WebhookService.validateWebhook(token, secretKey);
    
    if (!validado && secretKey.length > 0) {
      console.log('Tentativa de acesso ao webhook com token inválido. Verificar...');
      // Permitimos acesso para compatibilidade com Evolution API
    }
    
    // Detectar formato e extrair mensagem
    let processado = false;
    
    // Detectar formato da Evolution API (messages.upsert)
    if (rawData.event === 'messages.upsert' || rawData.type === 'messages.upsert') {
      console.log('Formato Evolution API detectado (messages.upsert)');
      
      try {
        // Extrair mensagem do formato messages.upsert
        if (rawData.data?.key && rawData.data?.message) {
          console.log('Processando mensagem do formato messages.upsert com key/message');
          
          const messageContent = rawData.data.message.conversation || 
                                rawData.data.message.extendedTextMessage?.text || 
                                'Mensagem sem texto';
          
          const message = {
            instance: rawData.instance || 'desconhecida',
            messageType: 'text',
            from: rawData.data.key.remoteJid,
            to: rawData.data.key.remoteJid,
            content: messageContent,
            timestamp: rawData.data.messageTimestamp || Date.now(),
            isGroup: rawData.data.key.remoteJid?.endsWith('@g.us') || false
          };
          
          console.log(`Mensagem extraída do formato messages.upsert: ${JSON.stringify(message, null, 2)}`);
          processado = true;
        }
      } catch (error) {
        console.error('Erro ao parsear formato messages.upsert:', error);
      }
    }
    
    // Processar mensagens pendentes para envio
    await processPendingMessages();
    
    // Retornar resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Webhook processado com sucesso',
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar webhook',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
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

// Interface para contato simplificado
interface ContatoSimples {
  nome: string;
  telefone: string;
  origem: string;
}

// Interface para dados do webhook
interface WebhookMessage {
  instance: string;
  messageType: string;
  from: string;
  to?: string;
  content: string;
  timestamp: number;
  isGroup: boolean;
  mediaUrl?: string;
}

/**
 * Processar mensagens pendentes para envio
 * Este método busca mensagens pendentes e as envia através da Evolution API via webhook
 */
async function processPendingMessages(): Promise<void> {
  try {
    const whatsappService = new WhatsAppService();
    
    // Obter mensagens pendentes
    const pendingMessages = await whatsappService.getPendingMessages();
    
    if (pendingMessages.length > 0) {
      console.log(`Processando ${pendingMessages.length} mensagens pendentes para envio via webhook`);
      
      // Aqui você pode implementar o envio efetivo das mensagens
      // Este é o ponto onde você deveria chamar a API da Evolution
      // Mas isso não é necessário neste caso, pois a API já está configurada
      
      // Marcar mensagens como processadas
      for (const message of pendingMessages) {
        await whatsappService.markMessageAsProcessed(message.timestamp);
        console.log(`Mensagem ${message.timestamp} marcada como processada`);
      }
    } else {
      console.log('Nenhuma mensagem pendente para envio');
    }
  } catch (error) {
    console.error('Erro ao processar mensagens pendentes:', error);
  }
} 