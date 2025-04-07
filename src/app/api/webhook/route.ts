import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ContatoModel from '@/models/Contato';

/**
 * Endpoint para receber webhooks do WhatsApp
 * Responde na mesma requisição, no modelo da Evolution API
 */
export async function POST(request: NextRequest) {
  try {
    // Obter os dados do webhook
    const evento = await request.json();
    console.log(`📥 Webhook recebido: ${JSON.stringify(evento).substring(0, 500)}...`);
    
    // Formato da Evolution API (messages.upsert)
    if (evento.event === 'messages.upsert' || evento.type === 'messages.upsert') {
      console.log('🔍 Formato Evolution API detectado (messages.upsert)');
      
      try {
        // Extrair dados relevantes
        if (evento.data?.key && evento.data?.message) {
          const remoteJid = evento.data.key.remoteJid;
          const messageContent = evento.data.message.conversation || 
                               evento.data.message.extendedTextMessage?.text || 
                               '';
          
          console.log(`📲 Mensagem de ${remoteJid}: "${messageContent}"`);
          
          // Não processar mensagens vazias ou enviadas pelo próprio bot
          if (!messageContent || evento.data.key.fromMe) {
            return NextResponse.json({ success: true, message: 'Mensagem ignorada (vazia ou do próprio bot)' });
          }
          
          // Processar a mensagem e gerar resposta
          const resposta = processarMensagem(messageContent);
          console.log(`💬 Resposta gerada: "${resposta}"`);
          
          // Guardar o contato no banco de dados em segundo plano (não aguardamos)
          salvarContato(remoteJid).catch(erro => {
            console.error('Erro ao salvar contato:', erro);
          });
          
          // Construir resposta no mesmo formato esperado pela Evolution API
          const respostaEvolution = {
            instance: evento.instance || 'PradoBot',
            number: remoteJid,
            options: {
              delay: 1200,
              presence: 'composing'
            },
            textMessage: {
              text: resposta
            }
          };
          
          console.log(`📤 Respondendo para ${remoteJid}: "${resposta}"`);
          
          // Retornar a resposta diretamente
          return NextResponse.json(respostaEvolution);
        }
      } catch (erro) {
        console.error('❌ Erro ao processar formato messages.upsert:', erro);
      }
    }
    
    // Formato mais simples (direto)
    else if (evento.from && evento.message) {
      console.log('🔍 Formato simples detectado');
      
      const numeroCliente = evento.from;
      const textoMensagem = typeof evento.message === 'string' ? evento.message : evento.message.text || '';
      
      console.log(`📲 Mensagem de ${numeroCliente}: "${textoMensagem}"`);
      
      // Processar a mensagem e gerar resposta
      const resposta = processarMensagem(textoMensagem);
      console.log(`💬 Resposta gerada: "${resposta}"`);
      
      // Guardar o contato no banco de dados em segundo plano
      salvarContato(numeroCliente).catch(erro => {
        console.error('Erro ao salvar contato:', erro);
      });
      
      // Construir resposta
      const respostaWebhook = {
        session: evento.session || 'PradoBot',
        number: numeroCliente,
        text: resposta
      };
      
      console.log(`📤 Respondendo para ${numeroCliente}: "${resposta}"`);
      
      // Retornar a resposta diretamente
      return NextResponse.json(respostaWebhook);
    }
    
    // Formato não reconhecido
    console.warn('⚠️ Formato de webhook não reconhecido');
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook recebido, mas formato não reconhecido',
      timestamp: new Date().toISOString()
    });
    
  } catch (erro) {
    console.error('❌ Erro no processamento do webhook:', erro);
    return NextResponse.json({
      success: false,
      error: 'Erro interno no processamento',
      message: erro instanceof Error ? erro.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Processa a mensagem recebida e gera uma resposta automática
 */
function processarMensagem(textoMensagem: string): string {
  const mensagem = textoMensagem.toLowerCase();
  
  // Regras de resposta automática
  if (mensagem.includes('olá') || mensagem.includes('ola') || mensagem.includes('oi')) {
    return 'Olá! Bem-vindo ao PromoBot. Como posso ajudá-lo hoje?';
  }
  
  if (mensagem.includes('ajuda') || mensagem.includes('help')) {
    return 'Estou aqui para ajudar! Você pode perguntar sobre nossas promoções, produtos ou horários de atendimento.';
  }
  
  if (mensagem.includes('preço') || mensagem.includes('preco') || mensagem.includes('valor')) {
    return 'Nossos preços variam conforme o produto. Consulte nosso catálogo ou peça informações específicas sobre o item que deseja.';
  }
  
  if (mensagem.includes('promoção') || mensagem.includes('promocao')) {
    return 'Temos várias promoções ativas! Visite nossa loja ou site para conhecer as ofertas do dia.';
  }
  
  if (mensagem.includes('horário') || mensagem.includes('horario') || mensagem.includes('atendimento')) {
    return 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h, e aos sábados das 8h às 12h.';
  }
  
  // Resposta padrão para qualquer outra mensagem
  return 'Obrigado pelo contato! Um atendente entrará em contato em breve. Ou digite "ajuda" para ver opções de atendimento automático.';
}

/**
 * Salva o contato no banco de dados
 */
async function salvarContato(numeroCompleto: string): Promise<void> {
  try {
    // Conectar ao MongoDB
    await connectToDatabase();
    
    // Padronizar o número de telefone
    let telefone = numeroCompleto;
    if (telefone.includes('@')) {
      telefone = telefone.split('@')[0]; // Remove a parte após o @ (s.whatsapp.net ou c.us)
    }
    
    // Garantir que o telefone tenha apenas números
    telefone = telefone.replace(/\D/g, '');
    
    // Verificar se o contato já existe
    const contatoExistente = await ContatoModel.findOne({ telefone });
    
    if (!contatoExistente) {
      // Criar contato simplificado
      const novoContato = await ContatoModel.create({
        nome: 'Contato WhatsApp',
        telefone: telefone,
        origem: 'webhook'
      });
      
      console.log(`✅ Novo contato criado: ${novoContato._id}, telefone: ${telefone}`);
    }
  } catch (erro) {
    console.error(`❌ Erro ao salvar contato ${numeroCompleto}:`, erro);
    throw erro;
  }
}

/**
 * Endpoint GET para verificação/configuração do webhook
 */
export async function GET(request: NextRequest) {
  console.log('✅ Requisição GET recebida no webhook - Verificação de status');
  return NextResponse.json({
    success: true,
    message: 'Webhook do PromoBot está ativo e funcionando',
    timestamp: new Date().toISOString()
  });
} 