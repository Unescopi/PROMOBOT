// Ajuste do fuso horário para Brasil (GMT-3)
process.env.TZ = 'America/Sao_Paulo';
console.log(`[API Campanhas] Timezone configurado para: ${process.env.TZ}`);
console.log(`[API Campanhas] Data e hora atual do servidor: ${new Date().toISOString()}`);
console.log(`[API Campanhas] Data e hora local formatada: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CampanhaModel from '@/models/Campanha';
import { WhatsAppService } from '@/services/whatsappService';
import mongoose from 'mongoose';

/**
 * GET - Listar campanhas
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Extrair parâmetros da URL
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    
    // Calcular skip para paginação
    const skip = (page - 1) * limit;
    
    // Construir query base
    let query: any = {};
    
    // Adicionar filtro por status (se fornecido)
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Adicionar filtro de busca por nome ou mensagem
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { mensagem: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Buscar campanhas com paginação
    const campanhas = await CampanhaModel
      .find(query)
      .sort({ criadoEm: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Contar total de campanhas para a paginação
    const total = await CampanhaModel.countDocuments(query);
    
    // Calcular total de páginas
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      campanhas,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar campanhas' },
      { status: 500 }
    );
  }
}

/**
 * POST - Criar uma nova campanha
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validar campos obrigatórios
    if (!data.nome || !data.mensagem || !data.tipo) {
      return NextResponse.json({
        success: false,
        message: 'Campos obrigatórios faltando'
      }, { status: 400 });
    }
    
    // Verificar conexão com WhatsApp antes de adicionar campanha
    if (data.testarConexao) {
      const whatsapp = new WhatsAppService();
      const status = await whatsapp.checkConnection();
      
      if (!status.connected) {
        return NextResponse.json({
          success: false,
          message: 'WhatsApp não está conectado',
          qrCode: status.qrCode
        }, { status: 400 });
      }
    }
    
    // Calcular total de destinatários
    const totalDestinatarios = data.destinatarios?.length || 0;
    
    // Definir status baseado na presença de agendamento
    const campaignStatus = data.agendamento ? 'scheduled' : 'draft';
    console.log('Criando campanha com status:', campaignStatus);
    console.log('Dados recebidos:', JSON.stringify(data, null, 2));
    
    // Criar nova campanha com dados formatados
    const campanha = new CampanhaModel({
      nome: data.nome,
      mensagem: data.mensagem,
      tipo: data.tipo,
      agendamento: data.agendamento,
      destinatarios: data.destinatarios || [],
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      status: campaignStatus,
      estatisticas: {
        total: totalDestinatarios,
        enviadas: 0,
        entregues: 0,
        lidas: 0,
        respondidas: 0,
        falhas: 0
      }
    });
    
    // Salvar no banco de dados
    const savedCampanha = await campanha.save();
    console.log('Campanha salva com sucesso:', JSON.stringify(savedCampanha, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Campanha criada com sucesso',
      campanha: savedCampanha
    });
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar solicitação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * PUT - Atualizar uma campanha existente
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validar ID
    if (!data.id) {
      return NextResponse.json({
        success: false,
        message: 'ID da campanha é obrigatório'
      }, { status: 400 });
    }
    
    // Encontrar e atualizar a campanha
    const campanha = await CampanhaModel.findById(data.id);
    
    if (!campanha) {
      return NextResponse.json({
        success: false,
        message: 'Campanha não encontrada'
      }, { status: 404 });
    }
    
    // Remover campos protegidos
    delete data.id;
    delete data._id;
    delete data.criadoEm;
    
    // Atualizar apenas campos válidos
    Object.keys(data).forEach(key => {
      if (key !== 'estatisticas') {
        campanha[key] = data[key];
      } else if (data.estatisticas) {
        // Atualizar estatísticas individualmente
        Object.keys(data.estatisticas).forEach(statKey => {
          campanha.estatisticas[statKey] = data.estatisticas[statKey];
        });
      }
    });
    
    // Salvar alterações
    await campanha.save();
    
    return NextResponse.json({
      success: true,
      campanha
    });
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar campanha',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * DELETE - Remover uma campanha
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID da campanha é obrigatório'
      }, { status: 400 });
    }
    
    // Encontrar e remover a campanha
    const resultado = await CampanhaModel.findByIdAndDelete(id);
    
    if (!resultado) {
      return NextResponse.json({
        success: false,
        message: 'Campanha não encontrada'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Campanha removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover campanha:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao remover campanha',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 