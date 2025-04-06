import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { WhatsAppService } from '@/services/whatsappService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validação básica
    if (!body.telefone || !body.mensagem) {
      return NextResponse.json(
        { error: 'Telefone e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Formatação do telefone para garantir o formato correto para WhatsApp
    let telefone = body.telefone.replace(/\D/g, '');
    if (!telefone.startsWith('55') && telefone.length === 11) {
      telefone = `55${telefone}`;
    }

    // Conectar ao MongoDB
    await connectToDatabase();
    
    // Registra a tentativa de envio
    const mensagemEnvio = {
      telefone,
      mensagem: body.mensagem,
      tipo: body.tipo || 'texto',
      mediaUrl: body.mediaUrl || null,
      campanhaId: body.campanhaId || null,
      status: 'enviando',
      dataEnvio: new Date(),
      dataAtualizacao: new Date(),
    };
    
    // Usar o modelo ou coleção diretamente
    const mensagensCollection = mongoose.connection.collection('mensagens');
    const resultadoEnvio = await mensagensCollection.insertOne(mensagemEnvio);
    
    // Instanciar o serviço WhatsApp
    const whatsappService = new WhatsAppService();
    
    // Envia a mensagem de acordo com o tipo
    let resultado;
    
    if (body.tipo === 'texto' || !body.tipo) {
      resultado = await whatsappService.sendTextMessage(telefone, body.mensagem);
    } else {
      // Para envio de mídia (imagem, vídeo, documento)
      resultado = await whatsappService.sendMediaMessage(
        telefone,
        body.mediaUrl,
        body.mensagem,
        body.tipo as 'image' | 'video' | 'document'
      );
    }
    
    // Atualiza o status da mensagem
    await mensagensCollection.updateOne(
      { _id: resultadoEnvio.insertedId },
      { 
        $set: { 
          status: 'enviada',
          evolutionApiResponse: resultado,
          dataAtualizacao: new Date()
        } 
      }
    );
    
    // Se esta mensagem é parte de uma campanha, atualiza as estatísticas
    if (body.campanhaId) {
      const campanhasCollection = mongoose.connection.collection('campanhas');
      await campanhasCollection.updateOne(
        { _id: body.campanhaId },
        { 
          $inc: { 
            "estatisticas.enviadas": 1 
          },
          $set: {
            ultimaAtualizacao: new Date()
          }
        }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      messageId: resultadoEnvio.insertedId,
      response: resultado
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
} 