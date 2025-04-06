import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ContatoSimplesModel, { IContato } from '@/models/ContatoSimples';
import mongoose from 'mongoose';

/**
 * GET - Listar contatos
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Obter parâmetros de consulta
    const url = new URL(request.url);
    const grupo = url.searchParams.get('grupo');
    const tag = url.searchParams.get('tag');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    
    // Construir query
    let query: any = {};
    
    if (grupo) {
      query.grupos = grupo;
    }
    
    if (tag) {
      query.tags = tag;
    }
    
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { telefone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Buscar contatos com paginação
    const total = await ContatoSimplesModel.countDocuments(query);
    const contatos = await ContatoSimplesModel.find(query)
      .sort({ nome: 1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    // Buscar todas as tags e grupos para filtros
    const allTags = await ContatoSimplesModel.distinct('tags');
    const allGroups = await ContatoSimplesModel.distinct('grupos');
    
    return NextResponse.json({
      success: true,
      data: {
        contatos,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        tags: allTags,
        grupos: allGroups
      }
    });
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar contatos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * POST - Criar um novo contato
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando processo de criação de contato');
    
    await connectToDatabase();
    console.log('Conectado ao MongoDB com sucesso');
    
    const data = await request.json();
    console.log('Dados recebidos:', data);
    
    // Validar campos obrigatórios com mensagens detalhadas
    if (!data.nome) {
      console.log('Nome não fornecido');
      return NextResponse.json({
        success: false,
        message: 'O nome do contato é obrigatório'
      }, { status: 400 });
    }
    
    if (!data.telefone) {
      console.log('Telefone não fornecido');
      return NextResponse.json({
        success: false,
        message: 'O telefone do contato é obrigatório'
      }, { status: 400 });
    }
    
    // Validar formato do telefone
    const telefoneRegex = /^(\+?[1-9]\d{1,14}|\d{10,11})$/;
    if (!telefoneRegex.test(data.telefone)) {
      console.log('Formato de telefone inválido:', data.telefone);
      return NextResponse.json({
        success: false,
        message: 'Formato de telefone inválido. Use apenas números, com DDD (ex: 11999998888)'
      }, { status: 400 });
    }
    
    // Verificar se o telefone já existe
    const telefoneExistente = await ContatoSimplesModel.findOne({ telefone: data.telefone });
    if (telefoneExistente) {
      console.log('Telefone já cadastrado:', data.telefone);
      return NextResponse.json({
        success: false,
        message: 'Este número de telefone já está cadastrado'
      }, { status: 400 });
    }
    
    // Validar email se fornecido
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
      console.log('Formato de email inválido:', data.email);
      return NextResponse.json({
        success: false,
        message: 'O formato do email é inválido'
      }, { status: 400 });
    }
    
    console.log('Validações passaram, criando novo contato');
    
    // Criar novo contato com o modelo simples
    const contato = new ContatoSimplesModel({
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      grupos: data.grupos || [],
      tags: data.tags || [],
      observacoes: data.observacoes
    });
    
    console.log('Modelo de contato criado:', contato);
    
    try {
      // Salvar no banco de dados
      const contatoSalvo = await contato.save();
      console.log('Contato salvo com sucesso:', contatoSalvo._id);
      
      return NextResponse.json({
        success: true,
        message: 'Contato criado com sucesso',
        contato: contatoSalvo
      });
    } catch (saveError: any) {
      console.error('Erro detalhado ao salvar contato no MongoDB:', saveError);
      
      // Verificar se é erro de validação do Mongoose
      if (saveError.name === 'ValidationError') {
        const errorMessages = Object.values(saveError.errors).map((err: any) => err.message);
        console.log('Erro de validação do Mongoose:', errorMessages);
        
        return NextResponse.json({
          success: false,
          message: 'Erro de validação',
          errors: errorMessages
        }, { status: 400 });
      }
      
      // Verificar se é erro de duplicação (código 11000)
      if (saveError.code === 11000) {
        console.log('Erro de duplicação (código 11000)');
        
        return NextResponse.json({
          success: false,
          message: 'Este telefone já está registrado para outro contato'
        }, { status: 400 });
      }
      
      throw saveError; // Repassar para o catch externo
    }
  } catch (error) {
    console.error('Erro completo ao criar contato:', error);
    
    // Tentar fornecer uma mensagem de erro mais detalhada
    let mensagemErro = 'Erro ao processar solicitação';
    if (error instanceof Error) {
      mensagemErro = error.message;
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json({
      success: false,
      message: mensagemErro,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * PUT - Atualizar um contato existente
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validar ID
    if (!data.id) {
      return NextResponse.json({
        success: false,
        message: 'ID do contato é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar o contato
    const contato = await ContatoSimplesModel.findById(data.id);
    
    if (!contato) {
      return NextResponse.json({
        success: false,
        message: 'Contato não encontrado'
      }, { status: 404 });
    }
    
    // Verificar se o telefone já existe em outro contato
    if (data.telefone && data.telefone !== contato.telefone) {
      const telefoneExistente = await ContatoSimplesModel.findOne({ 
        telefone: data.telefone,
        _id: { $ne: data.id }
      });
      
      if (telefoneExistente) {
        return NextResponse.json({
          success: false,
          message: 'Este número de telefone já está cadastrado para outro contato'
        }, { status: 400 });
      }
    }
    
    // Remover campos protegidos
    delete data.id;
    delete data._id;
    delete data.criadoEm;
    
    // Atualizar o contato
    Object.keys(data).forEach(key => {
      // Usar any para evitar problema de tipagem com indices dinâmicos
      (contato as any)[key] = data[key];
    });
    
    // Salvar alterações
    await contato.save();
    
    return NextResponse.json({
      success: true,
      message: 'Contato atualizado com sucesso',
      contato
    });
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar contato',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * DELETE - Remover um contato
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID do contato é obrigatório'
      }, { status: 400 });
    }
    
    // Encontrar e remover o contato
    const resultado = await ContatoSimplesModel.findByIdAndDelete(id);
    
    if (!resultado) {
      return NextResponse.json({
        success: false,
        message: 'Contato não encontrado'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Contato removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover contato:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao remover contato',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 