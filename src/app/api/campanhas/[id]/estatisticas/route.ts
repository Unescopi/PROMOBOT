import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CampanhaModel from '@/models/Campanha';

/**
 * GET - Obter estatísticas de uma campanha específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Buscar a campanha pelo ID
    const campanha = await CampanhaModel.findById(id);

    if (!campanha) {
      return NextResponse.json({
        success: false,
        message: 'Campanha não encontrada'
      }, { status: 404 });
    }

    // Calcular taxas e estatísticas
    const totalMensagens = campanha.contatos?.length || 0;
    const mensagensEnviadas = campanha.mensagensEnviadas || 0;
    const mensagensEntregues = campanha.mensagensEntregues || 0;
    const mensagensLidas = campanha.mensagensLidas || 0;
    const mensagensRespondidas = campanha.mensagensRespondidas || 0;
    const mensagensFalhas = mensagensEnviadas - mensagensEntregues;

    // Calcular datas para estatísticas diárias
    const hoje = new Date();
    const dadosDiarios = [];
    
    // Gerar dados diários dos últimos 7 dias (fictícios por enquanto)
    for (let i = 6; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      
      dadosDiarios.push({
        timestamp: data.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 50) + 10, // Valores fictícios por enquanto
        label: 'Mensagens'
      });
    }

    // Gerar dados horários das últimas 8 horas (fictícios por enquanto)
    const dadosHorarios = [];
    for (let i = 7; i >= 0; i--) {
      const hora = new Date(hoje);
      hora.setHours(hora.getHours() - i);
      
      dadosHorarios.push({
        timestamp: `${hora.getHours().toString().padStart(2, '0')}:00`,
        value: Math.floor(Math.random() * 20) + 5, // Valores fictícios por enquanto
        label: hora.getHours() < 12 ? 'Manhã' : 'Tarde'
      });
    }

    // Retornar estatísticas processadas
    return NextResponse.json({
      success: true,
      data: {
        id: campanha._id,
        nome: campanha.nome,
        status: campanha.status,
        criadoEm: campanha.criadoEm,
        terminadoEm: campanha.terminadoEm,
        
        // Contadores
        totalMensagens,
        mensagensEnviadas,
        mensagensEntregues,
        mensagensLidas,
        mensagensRespondidas,
        mensagensFalhas,
        
        // Dados temporais - substituir por dados reais quando disponíveis
        dadosHorarios,
        dadosDiarios,
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas da campanha:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar estatísticas da campanha',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 