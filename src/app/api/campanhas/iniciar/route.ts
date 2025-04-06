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
    // Obter o ID da campanha
    const { id } = await request.json();
    
    // Validar ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de campanha inválido ou ausente' },
        { status: 400 }
      );
    }
    
    // Conectar ao banco de dados
    await connectToDatabase();
    
    // Buscar a campanha
    const campanha = await CampanhaModel.findById(id);
    
    if (!campanha) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar status da campanha
    if (campanha.status === 'completed') {
      return NextResponse.json(
        { error: 'Esta campanha já foi concluída' },
        { status: 400 }
      );
    }
    
    if (campanha.status === 'running') {
      return NextResponse.json(
        { error: 'Esta campanha já está em execução' },
        { status: 400 }
      );
    }
    
    // Atualizar status para running
    campanha.status = 'running';
    campanha.atualizadoEm = new Date();
    await campanha.save();
    
    // Obter contatos destinatários
    let contatos: ContatoLean[] = [];
    
    if (campanha.destinatarios && campanha.destinatarios.length > 0) {
      // Filtrar apenas números válidos, removendo caracteres não numéricos
      const numerosValidos = campanha.destinatarios.filter((num: string) => {
        const numLimpo = num.replace(/\D/g, '');
        return numLimpo.length >= 10; // Número com DDD no Brasil
      });
      
      // Buscar contatos pelo número
      const result = await ContatoModel.find({
        telefone: { $in: numerosValidos }
      }).lean();
      
      contatos = result as unknown as ContatoLean[];
      
      // Se não encontrou todos, adicionar os números que não têm contato
      if (contatos.length < numerosValidos.length) {
        const telefonesEncontrados = contatos.map(c => c.telefone);
        const telefonesNaoEncontrados = numerosValidos.filter(
          (num: string) => !telefonesEncontrados.includes(num)
        );
        
        // Adicionar números não encontrados como "contatos simples"
        telefonesNaoEncontrados.forEach((telefone: string) => {
          contatos.push({
            _id: new mongoose.Types.ObjectId(),
            nome: 'Destinatário',
            telefone
          });
        });
      }
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
    
    console.log(`Iniciando envio para ${contatos.length} contatos. Campanha: ${campanha.nome}`);
    
    // Divide os contatos em lotes para evitar sobrecarga
    for (let i = 0; i < contatos.length; i += limiteEnvios) {
      const loteContatos = contatos.slice(i, i + limiteEnvios);
      
      console.log(`Processando lote ${Math.floor(i/limiteEnvios) + 1}/${Math.ceil(contatos.length/limiteEnvios)}`);
      
      // Processa cada contato no lote sequencialmente
      for (const contato of loteContatos) {
        try {
          console.log(`Enviando para ${contato.nome} (${contato.telefone})`);
          
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
            ) !== null;
          } else if (campanha.mediaUrl) {
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
              campanha.mediaUrl,
              mensagemPersonalizada,
              mediaType
            ) !== null;
          } else {
            console.log('Tipo de mensagem não suportado ou URL de mídia ausente');
            sucesso = false;
          }

          if (sucesso) {
            // Incrementa enviadas na estatística
            campanha.estatisticas.enviadas += 1;
            resultados.push({ telefone: contato.telefone, sucesso: true });
            console.log(`✅ Mensagem enviada com sucesso para ${contato.telefone}`);
          } else {
            // Incrementa falhas na estatística
            campanha.estatisticas.falhas += 1;
            resultados.push({ telefone: contato.telefone, sucesso: false });
            console.log(`❌ Falha ao enviar mensagem para ${contato.telefone}`);
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
    
    console.log(`Campanha concluída. Enviadas: ${campanha.estatisticas.enviadas}, Falhas: ${campanha.estatisticas.falhas}`);
    
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
      { error: 'Erro ao iniciar campanha', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 