import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/services/whatsappService';
import { connectToDatabase } from '@/lib/mongodb';
import ConfiguracaoModel from '@/models/Configuracao';

/**
 * POST - Enviar mensagem pelo WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validar campos obrigatórios
    if (!data.to || (!data.message && !data.mediaUrl)) {
      return NextResponse.json({
        success: false,
        message: 'Destinatário e mensagem/mídia são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar limites de envio diário nas configurações
    const configuracao = await ConfiguracaoModel.findOne();
    if (!configuracao) {
      return NextResponse.json({
        success: false,
        message: 'Configurações não encontradas'
      }, { status: 404 });
    }
    
    // Inicializar serviço WhatsApp
    const whatsappService = new WhatsAppService();
    
    // Verificar conexão com WhatsApp
    const connectionStatus = await whatsappService.checkConnection();
    if (!connectionStatus.connected) {
      return NextResponse.json({
        success: false,
        message: 'WhatsApp não está conectado',
        qrCode: connectionStatus.qrCode
      });
    }
    
    // Formatar mensagem com assinatura (caso exista)
    let mensagem = data.message || '';
    if (configuracao.assinatura && data.includeSignature !== false) {
      mensagem += '\n\n' + configuracao.assinatura
        .replace(/{nome}/g, configuracao.nomeEmpresa)
        .replace(/{empresa}/g, configuracao.nomeEmpresa);
    }
    
    let success = false;
    
    // Enviar mensagem
    if (data.mediaUrl) {
      // Enviar mensagem com mídia
      success = await whatsappService.sendMediaMessage(
        data.to,
        data.mediaUrl,
        mensagem,
        data.mediaType || 'image'
      );
    } else {
      // Enviar mensagem de texto
      success = await whatsappService.sendTextMessage(
        data.to,
        mensagem
      );
    }
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Mensagem enviada com sucesso'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Falha ao enviar mensagem'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Erro ao enviar mensagem pelo WhatsApp:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao enviar mensagem',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 