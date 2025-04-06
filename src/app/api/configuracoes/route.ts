import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ConfiguracaoModel from '@/models/Configuracao';

/**
 * GET - Obter configurações atuais
 */
export async function GET() {
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

    try {
      // Buscar a configuração atual (assumindo que haverá apenas uma entrada)
      let configuracao = await ConfiguracaoModel.findOne({});
  
      // Se não existir configuração, criar uma com valores padrão
      if (!configuracao) {
        configuracao = await ConfiguracaoModel.create({
          nomeEmpresa: 'Minha Empresa',
          whatsappNumber: '5511999999999',
          assinatura: 'Atenciosamente, {nome}',
          maxMensagensDia: 1000,
          intervaloEnvios: 2000, // Garantindo que seja pelo menos 500ms
          webhookUrl: '',
          apiKey: ''
        });
      }
  
      // Retornar as configurações
      return NextResponse.json({
        success: true,
        data: configuracao
      });
    } catch (dbError: any) {
      // Tratamento específico para erros de validação do MongoDB
      if (dbError.name === 'ValidationError') {
        console.error('Erro de validação MongoDB:', dbError);
        const errors = Object.values(dbError.errors || {}).map((err: any) => err.message);
        
        return NextResponse.json({
          success: false,
          message: 'Erro de validação ao buscar configurações',
          errors,
          validationError: true
        }, { status: 400 });
      }
      
      throw dbError; // Re-throw para o catch externo
    }
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar configurações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * POST - Atualizar configurações
 */
export async function POST(request: NextRequest) {
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
    
    // Obter dados da requisição
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({
        success: false,
        message: 'Formato JSON inválido'
      }, { status: 400 });
    }

    // Validar campos obrigatórios - adaptado para a nova estrutura de dados
    if (!data.geral || !data.geral.nomeEmpresa) {
      return NextResponse.json({
        success: false,
        message: 'Nome da empresa é obrigatório'
      }, { status: 400 });
    }

    // Normalizar e sanitizar dados
    const sanitizedData = sanitizeConfigData(data);

    // Buscar configuração atual ou criar nova
    let configuracao = await ConfiguracaoModel.findOne({});

    try {
      if (configuracao) {
        // Atualizar configuração existente
        configuracao = await ConfiguracaoModel.findOneAndUpdate(
          {}, 
          { $set: sanitizedData },
          { new: true, runValidators: true }
        );
      } else {
        // Criar nova configuração
        configuracao = await ConfiguracaoModel.create(sanitizedData);
      }
    } catch (dbError: any) {
      // Tratamento de erro específico de validação do MongoDB/Mongoose
      if (dbError.name === 'ValidationError') {
        const errors = Object.values(dbError.errors).map((err: any) => err.message);
        return NextResponse.json({
          success: false,
          message: 'Erro de validação',
          errors
        }, { status: 400 });
      }
      throw dbError; // Re-throw para o catch externo
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: configuracao
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar configurações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * PATCH - Atualizar configurações parcialmente
 */
export async function PATCH(request: NextRequest) {
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
    
    // Obter dados da requisição
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return NextResponse.json({
        success: false,
        message: 'Formato JSON inválido'
      }, { status: 400 });
    }

    // Sanitizar dados
    const sanitizedData = sanitizeConfigData(data);

    // Buscar configuração atual
    let configuracao = await ConfiguracaoModel.findOne({});
    
    try {
      if (!configuracao) {
        // Se não existir, criar configuração com dados fornecidos
        configuracao = await ConfiguracaoModel.create(sanitizedData);
      } else {
        // Atualizar apenas os campos fornecidos
        configuracao = await ConfiguracaoModel.findOneAndUpdate(
          {}, 
          { $set: sanitizedData },
          { new: true, runValidators: true }
        );
      }
    } catch (dbError: any) {
      // Tratamento de erro específico de validação do MongoDB/Mongoose
      if (dbError.name === 'ValidationError') {
        const errors = Object.values(dbError.errors).map((err: any) => err.message);
        return NextResponse.json({
          success: false,
          message: 'Erro de validação',
          errors
        }, { status: 400 });
      }
      throw dbError; // Re-throw para o catch externo
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: configuracao
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações parcialmente:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar configurações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * Função para sanitizar e normalizar dados de configuração
 */
function sanitizeConfigData(data: any) {
  const sanitized: any = {};
  
  // Processa cada seção conforme necessário
  if (data.geral) {
    sanitized.nomeEmpresa = data.geral.nomeEmpresa?.trim() || 'Minha Empresa';
    sanitized.timezone = data.geral.timezone || 'America/Sao_Paulo';
    sanitized.lingua = data.geral.lingua || 'pt_BR';
  }
  
  if (data.whatsapp) {
    // Usar whatsappNumber diretamente se disponível, caso contrário use telefone
    sanitized.whatsappNumber = data.whatsapp.whatsappNumber || data.whatsapp.telefone?.replace(/\D/g, '') || '';
  }
  
  if (data.mensagens) {
    sanitized.assinatura = data.mensagens.assinatura?.trim() || '';
    sanitized.maxMensagensDia = parseInt(data.mensagens.maxLote) || 100;
    // Garantir valor mínimo de 500ms para intervaloEnvios
    const intervaloEnvios = parseInt(data.mensagens.delayEntreMensagens) || 2000;
    sanitized.intervaloEnvios = Math.max(500, intervaloEnvios);
  }
  
  if (data.agendamentos) {
    sanitized.intervaloProcessamento = parseInt(data.agendamentos.intervaloProcessamento) || 5;
    sanitized.horarioInicio = data.agendamentos.horarioInicio || '08:00';
    sanitized.horarioFim = data.agendamentos.horarioFim || '20:00';
  }
  
  if (data.api) {
    // Garantir compatibilidade com ambos os formatos
    sanitized.webhookUrl = data.api.webhookUrl?.trim() || '';
    sanitized.apiKeyExternal = data.api.chaveApi?.trim() || data.api.apiKeyExternal?.trim() || '';
    // Adicionar o valor do webhook segredo, se presente
    if (data.api.webhookSegredo) {
      sanitized.webhookSegredo = data.api.webhookSegredo.trim();
    }
  }
  
  if (data.seguranca && data.seguranca.ipAddresses) {
    sanitized.ipPermitidos = Array.isArray(data.seguranca.ipAddresses) 
      ? data.seguranca.ipAddresses.filter(Boolean).map((ip: string) => ip.trim())
      : [];
  }
  
  return sanitized;
} 