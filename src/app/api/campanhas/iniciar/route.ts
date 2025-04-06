import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CampanhaModel from '@/models/Campanha';
import ContatoModel, { IContato } from '@/models/Contato';
import { WhatsAppService } from '@/services/whatsappService';
import mongoose from 'mongoose';

// Interface para tratar os resultados do lean()
interface ContatoLean {
  _id: mongoose.Types.ObjectId | string;
  nome: string;
  telefone: string;
  email?: string;
  grupos?: string[];
  tags?: string[];
  [key: string]: any;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.campanhaId) {
      return NextResponse.json(
        { error: 'ID da campanha é obrigatório' },
        { status: 400 }
      );
    }

    // Conectar ao banco de dados usando Mongoose
    await connectToDatabase();
    const campanhaId = body.campanhaId;
    
    // Busca a campanha usando Mongoose
    const campanha = await CampanhaModel.findById(campanhaId);
    
    if (!campanha) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      );
    }
    
    // Atualiza o status da campanha para "running"
    campanha.status = 'running';
    campanha.estatisticas.total = 0;
    campanha.estatisticas.enviadas = 0;
    campanha.estatisticas.entregues = 0;
    campanha.estatisticas.lidas = 0;
    campanha.estatisticas.falhas = 0;
    campanha.atualizadoEm = new Date();
    await campanha.save();
    
    // Determina quais contatos receberão a mensagem
    let contatos: ContatoLean[] = [];
    
    // Se há contatos selecionados específicos
    if (campanha.destinatarios && campanha.destinatarios.length > 0) {
      const result = await ContatoModel.find({
        telefone: { $in: campanha.destinatarios }
      }).lean();
      contatos = result as unknown as ContatoLean[];
    } 
    // Se há grupos selecionados
    else if (body.grupos && body.grupos.length > 0) {
      const result = await ContatoModel.find({
        grupos: { $in: body.grupos }
      }).lean();
      contatos = result as unknown as ContatoLean[];
    } 
    // Se há tags selecionadas
    else if (body.tags && body.tags.length > 0) {
      const result = await ContatoModel.find({
        tags: { $in: body.tags }
      }).lean();
      contatos = result as unknown as ContatoLean[];
    }
    
    // Se não houver contatos, retorna erro
    if (!contatos.length) {
      // Atualiza o status da campanha para "completed" com falha
      campanha.status = 'completed';
      campanha.estatisticas.falhas = 1;
      campanha.atualizadoEm = new Date();
      await campanha.save();
      
      return NextResponse.json(
        { error: 'Nenhum contato encontrado para os critérios selecionados' },
        { status: 400 }
      );
    }
    
    // Atualiza o total de mensagens a serem enviadas
    campanha.estatisticas.total = contatos.length;
    campanha.atualizadoEm = new Date();
    await campanha.save();
    
    // Envia as mensagens (em lote)
    const resultados = [];
    const limiteEnvios = 10; // Número máximo de envios por lote
    const delayEntreEnvios = 2000; // 2 segundos entre cada envio
    
    // Inicializa o serviço de WhatsApp
    const whatsappService = new WhatsAppService();
    
    // Divide os contatos em lotes para evitar sobrecarga
    for (let i = 0; i < contatos.length; i += limiteEnvios) {
      const loteContatos = contatos.slice(i, i + limiteEnvios);
      
      // Processa cada contato no lote sequencialmente
      for (const contato of loteContatos) {
        try {
          let sucesso = false;
          
          // Enviar mensagem baseada no tipo da campanha
          if (campanha.tipo === 'texto') {
            // Substituir variáveis na mensagem
            const mensagemPersonalizada = campanha.mensagem
              .replace(/{nome}/g, contato.nome || '')
              .replace(/{empresa}/g, 'Sua Empresa');
              
            // Enviar mensagem de texto
            sucesso = await whatsappService.sendTextMessage(
              contato.telefone,
              mensagemPersonalizada
            );
          } else {
            // Para envios com mídia (imagem, vídeo, documento)
            const mensagemPersonalizada = campanha.mensagem
              ? campanha.mensagem
                  .replace(/{nome}/g, contato.nome || '')
                  .replace(/{empresa}/g, 'Sua Empresa')
              : '';
              
            // Converter tipo da mensagem para tipo da API
            const mediaType = 
              campanha.tipo === 'imagem' ? 'image' : 
              campanha.tipo === 'video' ? 'video' : 'document';
              
            sucesso = await whatsappService.sendMediaMessage(
              contato.telefone,
              campanha.mediaUrl || '',
              mensagemPersonalizada,
              mediaType
            );
          }

          if (sucesso) {
            // Incrementa enviadas na estatística
            campanha.estatisticas.enviadas += 1;
            resultados.push({ telefone: contato.telefone, sucesso: true });
          } else {
            // Incrementa falhas na estatística
            campanha.estatisticas.falhas += 1;
            resultados.push({ telefone: contato.telefone, sucesso: false });
          }
          
          campanha.atualizadoEm = new Date();
          await campanha.save();
          
          // Aguarda o intervalo definido para evitar bloqueio da API do WhatsApp
          await new Promise(resolve => setTimeout(resolve, delayEntreEnvios));
        } catch (error) {
          console.error(`Erro ao enviar mensagem para ${contato.telefone}:`, error);
          
          // Incrementa falhas na estatística
          campanha.estatisticas.falhas += 1;
          campanha.atualizadoEm = new Date();
          await campanha.save();
        }
      }
    }
    
    // Finaliza a campanha
    campanha.status = 'completed';
    campanha.atualizadoEm = new Date();
    await campanha.save();
    
    return NextResponse.json({
      success: true,
      mensagensEnviadas: campanha.estatisticas.enviadas,
      resultados
    });
  } catch (error) {
    console.error('Erro ao iniciar campanha:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar campanha' },
      { status: 500 }
    );
  }
} 