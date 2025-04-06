import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/services/whatsappService';

/**
 * GET - Verificar status de conexão do WhatsApp
 */
export async function GET() {
  try {
    const whatsappService = new WhatsAppService();
    const connectionStatus = await whatsappService.checkConnection();
    
    return NextResponse.json({
      success: true,
      connected: connectionStatus.connected,
      qrCode: connectionStatus.qrCode
    });
  } catch (error) {
    console.error('Erro ao verificar status do WhatsApp:', error);
    return NextResponse.json({
      success: false,
      connected: false,
      message: 'Erro ao verificar conexão com WhatsApp',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * POST - Solicitar QR Code para conexão
 */
export async function POST() {
  try {
    const whatsappService = new WhatsAppService();
    const qrCode = await whatsappService.getQRCode();
    
    if (!qrCode) {
      return NextResponse.json({
        success: false,
        message: 'Não foi possível gerar o QR Code'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      qrCode
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao gerar QR Code',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 