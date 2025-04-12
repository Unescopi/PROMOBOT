const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const routes = require('./routes');
const schedulerService = require('./services/schedulerService');
const { defaultLimiter } = require('./middleware/rateLimiter');
const mongoose = require('mongoose');
require('dotenv').config();

// Inicializar o app Express
const app = express();

// Configurar middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar rate limiter global
app.use(defaultLimiter);

// Configurar rotas
app.use('/api', routes);

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

/**
 * Função para logar o status da conexão com o MongoDB
 * Exibe informações detalhadas sobre a conexão e as coleções disponíveis
 */
function logConnectionStatus() {
  const state = mongoose.connection.readyState;
  let stateStr = '';
  
  switch (state) {
    case 0:
      stateStr = 'Desconectado';
      break;
    case 1:
      stateStr = 'Conectado';
      break;
    case 2:
      stateStr = 'Conectando';
      break;
    case 3:
      stateStr = 'Desconectando';
      break;
    default:
      stateStr = 'Desconhecido';
  }
  
  if (state === 1) {
    console.log(`MongoDB conectado com sucesso [Estado: ${stateStr}]`);
    console.log(`• Host: ${mongoose.connection.host}`);
    console.log(`• Banco de dados: ${mongoose.connection.name}`);
    
    // Listar todas as coleções disponíveis
    mongoose.connection.db.listCollections().toArray()
      .then(collections => {
        console.log(`• Total de coleções disponíveis: ${collections.length}`);
        
        // Agrupar coleções por tipo
        const systemCollections = collections.filter(c => c.name.startsWith('system.')).map(c => c.name);
        const appCollections = collections.filter(c => !c.name.startsWith('system.')).map(c => c.name);
        
        if (appCollections.length > 0) {
          console.log(`• Coleções da aplicação (${appCollections.length}):`);
          console.log(`  - ${appCollections.join('\n  - ')}`);
        }
        
        if (systemCollections.length > 0 && process.env.NODE_ENV === 'development') {
          console.log(`• Coleções de sistema (${systemCollections.length}): ${systemCollections.join(', ')}`);
        }
        
        // Verificar se todas as coleções necessárias existem
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
      })
      .catch(err => {
        console.error('Erro ao listar coleções do MongoDB:', err.message);
      });
  } else {
    console.error(`MongoDB não está conectado! [Estado: ${stateStr}]`);
    console.error('Verifique as configurações de conexão e certifique-se de que o servidor MongoDB está rodando.');
  }
}

// Conectar ao banco de dados
connectDB()
  .then(() => {
    console.log('==================================================');
    console.log('✅ Conexão com o MongoDB estabelecida com sucesso!');
    logConnectionStatus();
    
    // Iniciar o agendador de campanhas após conectar ao banco
    console.log('🔄 Iniciando agendador de campanhas...');
    const schedulerResult = schedulerService.start();
    
    if (schedulerResult && schedulerResult.isRunning) {
      console.log('✅ Agendador de campanhas iniciado com sucesso');
      console.log(`• Intervalo de verificação: ${schedulerResult.checkInterval / 1000} segundos`);
      console.log(`• Próxima verificação: ${schedulerResult.nextCheck.toLocaleString()}`);
    } else {
      console.log('⚠️ Agendador iniciado, mas sem informações de status');
    }
  })
  .catch(err => {
    console.error('==================================================');
    console.error('❌ Erro ao conectar ao MongoDB:');
    console.error(`• ${err.message}`);
    console.error('==================================================\n');
  });

// Função para garantir o fechamento correto ao encerrar a aplicação
const gracefulShutdown = () => {
  console.log('\n==================================================');
  console.log('🛑 Encerrando aplicação...');
  
  // Para o agendador
  console.log('Parando o agendador de campanhas');
  schedulerService.stop();
  console.log('✅ Agendador de campanhas parado');
  
  // Fechar conexão com o MongoDB
  mongoose.connection.close()
    .then(() => console.log('✅ Conexão com MongoDB fechada'))
    .catch(err => console.error('❌ Erro ao fechar conexão com MongoDB:', err.message));
  
  // Tentar encerrar qualquer outra conexão pendente
  try {
    // Dar tempo para as conexões se fecharem adequadamente
    console.log('⏱️ Aguardando conexões pendentes se fecharem...');
    setTimeout(() => {
      console.log('✅ Processo encerrado');
      console.log('==================================================\n');
      process.exit(0);
    }, 1500);
  } catch (error) {
    console.error('❌ Erro no encerramento:', error.message);
    process.exit(1);
  }
};

// Registra handlers para sinais de encerramento
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Exportar o app
module.exports = app; 