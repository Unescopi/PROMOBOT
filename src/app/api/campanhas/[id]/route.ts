import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CampanhaModel from '@/models/Campanha';
import StatisticsService from '@/services/statisticsService';

/**
 * GET - Obter detalhes de uma campanha específica
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Aguardar o parâmetro antes de desestruturar
  const id = params?.id;
  
  try {
    await connectToDatabase();
    
    // Buscar a campanha pelo ID
    const campanha = await CampanhaModel.findById(id);
    
    // Verificar se a campanha existe
    if (!campanha) {
      return NextResponse.json(
        { success: false, message: 'Campanha não encontrada' },
        { status: 404 }
      );
    }
    
    // Atualizar estatísticas a partir da fonte de dados (em um sistema real)
    // Aqui, estamos apenas simulando para exemplo
    let estatisticasAtualizadas = campanha.estatisticas;
    
    // Em um sistema real, você obteria estatísticas atualizadas de uma API externa
    // ou de um serviço de mensagens como Twilio ou WhatsApp Business API
    
    // Para campanhas em execução, simulamos algum progresso
    if (campanha.status === 'running') {
      const tempoDecorrido = Date.now() - new Date(campanha.criadoEm).getTime();
      const diasDecorridos = tempoDecorrido / (1000 * 60 * 60 * 24);
      
      // Simular progresso baseado no tempo decorrido
      const fatorProgresso = Math.min(diasDecorridos / 2, 1); // Máximo de 2 dias para completar
      
      // Atualizar estatísticas com base no progresso
      estatisticasAtualizadas = {
        total: campanha.estatisticas.total,
        enviadas: Math.floor(campanha.estatisticas.total * fatorProgresso),
        entregues: Math.floor(campanha.estatisticas.total * fatorProgresso * 0.95), // 95% entregues
        lidas: Math.floor(campanha.estatisticas.total * fatorProgresso * 0.8), // 80% lidas
        respondidas: Math.floor(campanha.estatisticas.total * fatorProgresso * 0.3), // 30% respondidas
        falhas: Math.floor(campanha.estatisticas.total * fatorProgresso * 0.05) // 5% falhas
      };
      
      // Verificar se a campanha foi concluída
      if (estatisticasAtualizadas.enviadas >= campanha.estatisticas.total) {
        campanha.status = 'completed';
        campanha.estatisticas = estatisticasAtualizadas;
        await campanha.save();
      }
    }
    
    // Retornar a campanha com estatísticas atualizadas
    return NextResponse.json({
      success: true,
      data: {
        ...campanha.toObject(),
        estatisticas: estatisticasAtualizadas
      }
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da campanha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar detalhes da campanha' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Atualizar parcialmente uma campanha (ex: mudar status)
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // Aguardar o parâmetro antes de desestruturar
  const id = params?.id;
  
  try {
    await connectToDatabase();
    
    // Obter dados do corpo da requisição
    const body = await request.json();
    const { action, agendamento } = body;
    
    // Buscar a campanha pelo ID
    const campanha = await CampanhaModel.findById(id);
    
    // Verificar se a campanha existe
    if (!campanha) {
      return NextResponse.json(
        { success: false, message: 'Campanha não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar a ação solicitada
    switch (action) {
      case 'pause':
        // Pausar campanha em execução
        if (campanha.status !== 'running') {
          return NextResponse.json(
            { success: false, message: 'Apenas campanhas em execução podem ser pausadas' },
            { status: 400 }
          );
        }
        campanha.status = 'paused';
        break;
        
      case 'resume':
        // Retomar campanha pausada
        if (campanha.status !== 'paused') {
          return NextResponse.json(
            { success: false, message: 'Apenas campanhas pausadas podem ser retomadas' },
            { status: 400 }
          );
        }
        campanha.status = 'running';
        break;
        
      case 'cancel':
        // Cancelar campanha em qualquer estado, exceto completed ou cancelled
        if (['completed', 'cancelled'].includes(campanha.status)) {
          return NextResponse.json(
            { success: false, message: 'Esta campanha não pode ser cancelada' },
            { status: 400 }
          );
        }
        campanha.status = 'cancelled';
        break;
        
      default:
        // Se não for uma ação de controle, verificar se é um update de status
        if (body.status === 'scheduled' && agendamento) {
          campanha.status = 'scheduled';
          campanha.agendamento = agendamento;
        } else if (body.status === 'running') {
          campanha.status = 'running';
        } else {
          return NextResponse.json(
            { success: false, message: 'Ação inválida ou não suportada' },
            { status: 400 }
          );
        }
    }
    
    // Salvar as alterações
    await campanha.save();
    
    // Retornar a campanha atualizada
    return NextResponse.json({
      success: true,
      message: 'Campanha atualizada com sucesso',
      campanha: campanha.toObject()
    });
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar campanha' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remover uma campanha
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // Aguardar o parâmetro antes de desestruturar
  const id = params?.id;
  
  try {
    await connectToDatabase();
    
    // Buscar e remover a campanha pelo ID
    const campanha = await CampanhaModel.findByIdAndDelete(id);
    
    // Verificar se a campanha foi encontrada e removida
    if (!campanha) {
      return NextResponse.json(
        { success: false, message: 'Campanha não encontrada' },
        { status: 404 }
      );
    }
    
    // Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Campanha removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover campanha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao remover campanha' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Atualizar completamente uma campanha
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // Aguardar o parâmetro antes de desestruturar
  const id = params?.id;
  
  try {
    await connectToDatabase();
    
    // Obter dados do corpo da requisição
    const body = await request.json();
    
    // Verificar campos obrigatórios
    if (!body.nome || !body.mensagem || !body.tipo) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios: nome, mensagem e tipo' },
        { status: 400 }
      );
    }
    
    // Buscar a campanha pelo ID
    const campanha = await CampanhaModel.findById(id);
    
    // Verificar se a campanha existe
    if (!campanha) {
      return NextResponse.json(
        { success: false, message: 'Campanha não encontrada' },
        { status: 404 }
      );
    }
    
    // Atualizar os campos editáveis
    campanha.nome = body.nome;
    campanha.mensagem = body.mensagem;
    campanha.tipo = body.tipo;
    
    if (body.agendamento !== undefined) {
      campanha.agendamento = body.agendamento;
    }
    
    if (body.mediaUrl !== undefined) {
      campanha.mediaUrl = body.mediaUrl;
    }
    
    if (body.mediaType !== undefined) {
      campanha.mediaType = body.mediaType;
    }
    
    // Salvar as alterações
    await campanha.save();
    
    // Retornar a campanha atualizada
    return NextResponse.json({
      success: true,
      message: 'Campanha atualizada com sucesso',
      campanha: campanha.toObject()
    });
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao atualizar campanha' },
      { status: 500 }
    );
  }
} 