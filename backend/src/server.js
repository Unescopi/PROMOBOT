const app = require('./app');
const evolutionApiService = require('./services/evolutionApiService');
const queueService = require('./services/queueService');
const os = require('os');
const mongoose = require('mongoose');
const { checkRedisConnection } = require('./utils/redisCheck');
const socketService = require('./services/socketService');
require('dotenv').config();

// Logo ASCII do PromoBot
const promobotLogo = `
 \x1b[34m____                            ____        _   
|  _ \\ _ __ ___  _ __ ___   ___ | __ )  ___ | |_ 
| |_) | '__/ _ \\| '_ \` _ \\ / _ \\|  _ \\ / _ \\| __|
|  __/| | | (_) | | | | | | (_) | |_) | (_) | |_ 
|_|   |_|  \\___/|_| |_| |_|\\___/|____/ \\___/ \\__|\x1b[0m
                                                 
 \x1b[32m+-----------------+
 |      .---.      |
 |     /     \\     |
 |    | () () |    |
 |     \\  =  /     |
 |      '---'      |
 |                 |
 | +-+-+-+-+-+-+-+ |
 | |P|R|O|M|O|B|O|T|
 | +-+-+-+-+-+-+-+ |
 +-----------------+\x1b[0m
`;

// Exibir logo antes de tudo
console.log(promobotLogo);

const PORT = process.env.PORT || 3000;

/**
 * Verifica o status dos serviços principais e imprime logs detalhados
 */
async function checkServices() {
  console.log('\n==================================================');
  console.log('🤖 PROMOBOT - Sistema de Automação de Mensagens 🤖');
  console.log('==================================================\n');
  
  // Informações do sistema
  console.log('📊 INFORMAÇÕES DO SISTEMA:');
  console.log(`• Sistema Operacional: ${os.platform()} ${os.release()}`);
  console.log(`• Arquitetura: ${os.arch()}`);
  console.log(`• Node.js: ${process.version}`);
  console.log(`• Versões: ${JSON.stringify({
    node: process.versions.node,
    v8: process.versions.v8,
    npm: process.env.npm_config_node_version || 'desconhecido'
  })}`);
  console.log(`• Memória Total: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
  console.log(`• Memória Livre: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB (${Math.round((os.freemem() / os.totalmem()) * 100)}%)`);
  console.log(`• CPUs: ${os.cpus().length} núcleos`);
  console.log(`• Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`• Diretório de execução: ${process.cwd()}`);
  console.log(`• Uptime do sistema: ${Math.floor(os.uptime() / 60 / 60)} horas ${Math.floor((os.uptime() / 60) % 60)} minutos`);
  
  // Verificar status do MongoDB
  console.log('\n📊 STATUS DO BANCO DE DADOS:');
  const mongoState = mongoose.connection.readyState;
  let stateStr = '';
  
  switch (mongoState) {
    case 0:
      stateStr = '❌ Desconectado';
      break;
    case 1:
      stateStr = '✅ Conectado';
      break;
    case 2:
      stateStr = '🔄 Conectando...';
      break;
    case 3:
      stateStr = '🔄 Desconectando...';
      break;
    default:
      stateStr = '❓ Desconhecido';
  }
  
  console.log(`• Estado: ${stateStr}`);
  
  if (mongoState === 1) {
    console.log(`• Host: ${mongoose.connection.host}`);
    console.log(`• Banco: ${mongoose.connection.name}`);
    console.log(`• URL: ${process.env.MONGODB_URI?.replace(/\/\/(.+?):(.+?)@/, '//***:***@') || 'não disponível'}`);
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`• Coleções: ${collections.length} disponíveis`);
      
      // Agrupar coleções por tipo
      const appCollections = collections.filter(c => !c.name.startsWith('system.')).map(c => c.name);
      console.log(`• Coleções da aplicação (${appCollections.length}):`);
      
      // Dividir em grupos para melhor legibilidade
      const chunks = [];
      for (let i = 0; i < appCollections.length; i += 5) {
        chunks.push(appCollections.slice(i, i + 5));
      }
      
      chunks.forEach(chunk => {
        console.log(`  - ${chunk.join(', ')}`);
      });
      
      // Verificar coleções necessárias
      const requiredCollections = [
        'contacts', 
        'messages', 
        'campaigns', 
        'messagestatuses',
        'users',
        'tags'
      ];
      
      const missingCollections = requiredCollections.filter(
        collection => !appCollections.includes(collection)
      );
      
      if (missingCollections.length > 0) {
        console.warn(`⚠️ ATENÇÃO: Algumas coleções necessárias não foram encontradas: ${missingCollections.join(', ')}`);
        console.warn('• Isso pode indicar que o banco de dados não foi inicializado corretamente ou nomes foram alterados.');
        console.warn('• As coleções serão criadas automaticamente quando necessário.');
      }
      
      // Estatísticas do servidor MongoDB se disponível
      try {
        const serverStatus = await mongoose.connection.db.admin().serverStatus();
        console.log(`• MongoDB versão: ${serverStatus.version}`);
        console.log(`• Conexões ativas: ${serverStatus.connections.current} (max: ${serverStatus.connections.available})`);
        console.log(`• Uptime do MongoDB: ${Math.floor(serverStatus.uptime / 60 / 60)} horas ${Math.floor((serverStatus.uptime / 60) % 60)} minutos`);
      } catch (err) {
        // Admin pode não estar disponível para usuários sem privilégios
        console.log('• Estatísticas do servidor MongoDB não disponíveis (requer privilégios de admin)');
      }
    } catch (err) {
      console.log('• Erro ao listar coleções do MongoDB');
      console.error(`  - ${err.message}`);
    }
  } else {
    console.error('❌ MongoDB não está conectado corretamente');
    console.error(`• Verifique a URL de conexão: ${process.env.MONGODB_URI?.replace(/\/\/(.+?):(.+?)@/, '//***:***@') || 'não definida'}`);
    console.error('• Certifique-se de que o servidor MongoDB está rodando e acessível');
  }
  
  // Verificar conexão com a Evolution API
  try {
    console.log('\n🔄 Verificando conexão com a Evolution API...');
    const evolutionStatus = await evolutionApiService.checkConnectionStatus();
    
    if (evolutionStatus && evolutionStatus.instance?.state === 'open') {
      console.log('✅ Evolution API conectada com sucesso!');
      console.log(`• Instância: ${process.env.WHATSAPP_INSTANCE}`);
      console.log(`• Estado: ${evolutionStatus.instance.state}`);
      console.log(`• URL da API: ${process.env.EVOLUTION_API_URL}`);
      
      // Adicionar detalhes do WhatsApp se disponíveis
      if (evolutionStatus.instance.phone) {
        console.log(`• Número conectado: ${evolutionStatus.instance.phone.number}`);
        console.log(`• Nome do perfil: ${evolutionStatus.instance.phone.name || 'Não definido'}`);
      }
      
      // Verificar métricas de envio de forma segura
      try {
        const metrics = await evolutionApiService.getMetrics().catch(err => {
          console.log('• Métricas de envio não disponíveis - endpoint não encontrado');
          return null; // Retorna null em vez de propagar o erro
        });
        
        if (metrics && metrics.success) {
          console.log(`• Mensagens enviadas hoje: ${metrics.data.dailySent || 0}`);
          console.log(`• Mensagens recebidas hoje: ${metrics.data.dailyReceived || 0}`);
        }
      } catch (err) {
        // Já tratamos o erro acima, esse bloco é apenas por segurança adicional
        console.log('• Métricas de envio não disponíveis');
      }
    } else {
      console.log('⚠️ Evolution API conectada, mas não autenticada no WhatsApp');
      console.log(`• Estado: ${evolutionStatus?.instance?.state || 'desconhecido'}`);
      console.log('• É necessário autenticar escaneando o QR code');
      console.log(`• URL da API: ${process.env.EVOLUTION_API_URL}`);
      
      // Verificar se há QR Code disponível
      try {
        const qrCode = await evolutionApiService.getQrCode();
        if (qrCode && qrCode.success) {
          console.log('• QR Code disponível para autenticação');
          console.log(`• URL para QR Code: ${process.env.EVOLUTION_API_URL}/instance/qr/${process.env.WHATSAPP_INSTANCE}`);
        }
      } catch (err) {
        console.log('• QR Code não disponível no momento');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao conectar com a Evolution API:');
    console.error(`• ${error.message}`);
    console.error(`• URL configurada: ${process.env.EVOLUTION_API_URL}`);
    console.error('• Verifique se o serviço está em execução e acessível');
    
    // Adicionar instruções de diagnóstico
    console.error('\n• DIAGNÓSTICO:');
    console.error('  1. Verifique se a URL da API está correta no arquivo .env');
    console.error('  2. Confirme se a instância do WhatsApp existe e está corretamente nomeada');
    console.error('  3. Teste se a API está acessível executando: curl -X GET '+process.env.EVOLUTION_API_URL+'/instance/connectionState/'+process.env.WHATSAPP_INSTANCE);
  }
  
  // Verificar sistema de filas
  try {
    console.log('\n🔄 Verificando sistema de filas...');
    
    // Verificar Redis primeiro
    console.log('• Verificando conexão com Redis...');
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';
    
    if (!redisEnabled) {
      console.log('⚠️ Redis está desativado no arquivo .env (REDIS_ENABLED=false)');
      console.log('• O sistema usará modo de fallback (sem enfileiramento)');
    } else {
      const redisStatus = await checkRedisConnection();
      
      if (redisStatus.success) {
        console.log('✅ Redis conectado com sucesso!');
        console.log(`• Versão: ${redisStatus.stats.version}`);
        console.log(`• Uptime: ${redisStatus.stats.uptime}`);
        console.log(`• Memória em uso: ${redisStatus.stats.memory.used}`);
        console.log(`• Clientes conectados: ${redisStatus.stats.clients}`);
      } else {
        console.error('❌ Falha na conexão com Redis:');
        console.error(`• Erro: ${redisStatus.error}`);
        console.error(`• Problema: ${redisStatus.diagnosis.problem}`);
        console.error('• Possíveis causas:');
        redisStatus.diagnosis.possibleCauses.forEach(cause => {
          console.error(`  - ${cause}`);
        });
        console.error('• Sugestões:');
        redisStatus.diagnosis.suggestions.forEach(suggestion => {
          console.error(`  - ${suggestion}`);
        });
        console.log('• O sistema usará modo de fallback (sem enfileiramento)');
      }
    }
    
    // Agora obter estatísticas da fila
    const queueStats = await queueService.getQueueStats();
    
    if (queueStats.success) {
      if (queueStats.fallbackMode) {
        console.log('⚠️ Sistema de filas em modo de fallback (sem Redis)');
        console.log('• As mensagens serão enviadas diretamente sem enfileiramento');
        console.log('• Sem limitação de taxa será aplicada');
      } else {
        console.log('✅ Sistema de filas inicializado com sucesso!');
        console.log(`• Concorrência: ${queueStats.config.concurrency} workers`);
        console.log(`• Limite de mensagens: ${queueStats.config.messagesPerMinute}/minuto`);
        console.log(`• Jobs na fila: ${queueStats.jobs.waiting} aguardando, ${queueStats.jobs.active} ativos`);
        
        // Adicionar informações da conexão Redis
        console.log(`• Conexão Redis: ${process.env.REDIS_URL?.replace(/\/\/(.+?):(.+?)@/, '//***:***@') || process.env.REDIS_HOST || 'localhost:6379'}`);
        
        // Adicionar mais estatísticas detalhadas de jobs
        if (queueStats.jobs.failed > 0) {
          console.log(`⚠️ Atenção: ${queueStats.jobs.failed} jobs falharam recentemente`);
        }
        
        if (queueStats.jobs.delayed > 0) {
          console.log(`• Jobs programados: ${queueStats.jobs.delayed}`);
        }
        
        if (queueStats.jobs.completed) {
          console.log(`• Jobs processados: ${queueStats.jobs.completed} completados`);
        }
      }
    } else {
      console.log('⚠️ Sistema de filas inicializado com alertas');
      if (queueStats.message) {
        console.log(`• Alerta: ${queueStats.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de filas:');
    console.error(`• ${error.message}`);
    console.error('• Verifique se o Redis está em execução no endereço configurado');
    console.error(`• URL Redis: ${process.env.REDIS_URL?.replace(/\/\/(.+?):(.+?)@/, '//***:***@') || 'localhost:6379'}`);
    console.error('• O sistema tentará operar sem o sistema de filas (modo fallback)');
  }
  
  // Informações sobre o agendador de campanhas
  const schedulerResult = require('./services/schedulerService').getStatus();
  if (schedulerResult && schedulerResult.isRunning) {
    console.log(`✅ Agendador de campanhas iniciado com sucesso`);
    console.log(`• Tipo: Agendadas e recorrentes`);
    console.log(`• Intervalo de verificação: ${schedulerResult.checkInterval / 1000} segundos`);
    console.log(`• Próxima verificação: ${schedulerResult.nextCheck.toLocaleString()}`);
  } else {
    console.error('❌ Agendador de campanhas não está em execução');
    console.log('• Inicie o agendador manualmente ou reinicie o servidor');
  }
  
  // Mostrar URLs da API
  console.log('\n🌐 ENDPOINTS DISPONÍVEIS:');
  console.log(`• API:            http://localhost:${PORT}/api`);
  console.log(`• Documentação:   http://localhost:${PORT}/api-docs`);
  console.log(`• Status da fila:  http://localhost:${PORT}/api/queue/stats`);
  console.log(`• Status da instância: http://localhost:${PORT}/api/evolution/status`);
  console.log(`• Contatos:       http://localhost:${PORT}/api/contacts`);
  console.log(`• Campanhas:      http://localhost:${PORT}/api/campaigns`);
  console.log(`• Mensagens:      http://localhost:${PORT}/api/messages`);
  console.log(`• Segmentação:    http://localhost:${PORT}/api/segmentation`);
  
  // Listagem de recursos do sistema
  console.log('\n📋 RECURSOS DO SISTEMA:');
  console.log(`• MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Conectado' : '❌ Desconectado'}`);
  console.log(`• Evolution API: ${evolutionApiService.isConnected ? '✅ Conectado' : '❌ Desconectado'}`);
  console.log(`• Redis: ${queueService.queueEnabled ? '✅ Ativo' : '❌ Inativo (fallback)'}`);
  console.log(`• Agendador: ${require('./services/schedulerService').isRunning ? '✅ Em execução' : '❌ Parado'}`);
  
  console.log('\n==================================================');
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log('==================================================\n');
}

// Iniciar o servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  
  // Inicializar Socket.IO
  socketService.initialize(server);
  
  // Verificar serviços
  checkServices();
}); 