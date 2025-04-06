import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CampanhaModel from '@/models/Campanha';
import ContatoSimplesModel from '@/models/ContatoSimples';

/**
 * GET - Obter estatísticas reais do sistema
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar conexão com banco de dados
    try {
      await connectToDatabase();
    } catch (connError) {
      console.error('Erro ao conectar com MongoDB:', connError);
      return NextResponse.json({
        success: false,
        message: 'Banco de dados não disponível no momento',
        error: connError instanceof Error ? connError.message : 'Erro desconhecido',
        isMongoDB: true
      }, { status: 503 });
    }

    // Obter contagem de contatos usando o modelo ContatoSimplesModel
    const totalContacts = await ContatoSimplesModel.countDocuments({});
    
    // Como o modelo simples pode não ter o campo 'ativo', vamos considerar todos como ativos
    const activeContacts = totalContacts;

    // Obter contagem de campanhas
    const totalCampaigns = await CampanhaModel.countDocuments({});
    const activeCampaigns = await CampanhaModel.countDocuments({ 
      status: { $in: ['ativa', 'em_andamento', 'agendada'] } 
    });

    // Obter dados de mensagens (estimativas baseadas nas campanhas)
    const campanhas = await CampanhaModel.find({}, {
      mensagensEnviadas: 1,
      mensagensEntregues: 1,
      mensagensLidas: 1,
      mensagensRespondidas: 1,
      criadoEm: 1
    });

    // Calcular totais de mensagens
    let totalMessages = 0;
    let messagesDelivered = 0;
    let messagesRead = 0;
    let messagesResponded = 0;
    let messagesLastWeek = 0;

    // Data para filtrar mensagens da última semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    campanhas.forEach(campanha => {
      // Contar mensagens totais
      const enviadas = campanha.mensagensEnviadas || 0;
      totalMessages += enviadas;
      
      // Contar mensagens entregues, lidas e respondidas
      messagesDelivered += campanha.mensagensEntregues || 0;
      messagesRead += campanha.mensagensLidas || 0;
      messagesResponded += campanha.mensagensRespondidas || 0;
      
      // Contar mensagens da última semana
      if (campanha.criadoEm && campanha.criadoEm > oneWeekAgo) {
        messagesLastWeek += enviadas;
      }
    });

    // Calcular taxas
    const deliveryRate = totalMessages > 0 ? (messagesDelivered / totalMessages) * 100 : 0;
    const readRate = messagesDelivered > 0 ? (messagesRead / messagesDelivered) * 100 : 0;
    const responseRate = messagesRead > 0 ? (messagesResponded / messagesRead) * 100 : 0;

    // Retornar estatísticas completas
    return NextResponse.json({
      success: true,
      data: {
        totalContacts,
        activeContacts,
        totalCampaigns,
        activeCampaigns,
        totalMessages,
        messagesLastWeek,
        deliveryRate,
        readRate,
        responseRate,
        lastUpdated: new Date().toISOString(),
        // Adicionar mais estatísticas conforme necessário
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar estatísticas',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 