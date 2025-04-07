import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'promobot';

if (!MONGODB_URI) {
  throw new Error(
    'Por favor, defina a variável de ambiente MONGODB_URI dentro de .env.local'
  );
}

// Interface para o cache de conexão do Mongoose
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Configuração do timezone para o Brasil (GMT-3)
process.env.TZ = 'America/Sao_Paulo';
console.log(`Timezone configurado para: ${process.env.TZ}`);
console.log(`Data e hora atual: ${new Date().toISOString()}`);

/**
 * Cache global para a conexão MongoDB
 */
let cached: MongooseCache = {
  conn: null,
  promise: null
};

/**
 * Conecta ao MongoDB com melhor gerenciamento de erros e reconexão
 */
export async function connectToDatabase(timeoutMs = 30000): Promise<typeof mongoose> {
  try {
    console.log(`Tentando conectar ao MongoDB com timeout de ${timeoutMs}ms`);
    
    // Se já estamos conectados, retornar a conexão existente
    if (cached.conn) {
      if (mongoose.connection.readyState === 1) {
        console.log('Usando conexão MongoDB existente');
        return cached.conn;
      } else {
        console.log(`Estado atual da conexão: ${mongoose.connection.readyState}`);
      }
    }

    // Se uma conexão está em andamento, aguarde ela terminar
    if (!cached.promise) {
      console.log('Iniciando nova conexão com MongoDB');
      
      // Configurações de conexão
      const opts = {
        bufferCommands: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: timeoutMs,
        socketTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs,
        heartbeatFrequencyMS: 10000,
        // Usando a nova string de opções
        useNewUrlParser: true,
        useUnifiedTopology: true
      };
      
      // Registrar eventos para diagnóstico
      mongoose.connection.on('connected', () => {
        console.log('MongoDB conectado com sucesso');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('Erro na conexão MongoDB:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB desconectado');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconectado');
      });
      
      // Iniciar conexão
      cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        console.log('Conexão MongoDB estabelecida');
        return mongoose;
      }).catch((error) => {
        console.error('Falha ao conectar ao MongoDB:', error);
        cached.promise = null;
        throw error;
      });
    } else {
      console.log('Aguardando conexão existente concluir...');
    }

    // Aguardar a conexão e atualizar o cache
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error('Erro grave ao tentar conectar ao MongoDB:', error);
    // Remover a promessa do cache para permitir novas tentativas
    cached.promise = null;
    throw error;
  }
}

// Garantir que a conexão seja fechada quando o aplicativo for encerrado
if (process.env.NODE_ENV !== 'development') {
  process.on('SIGINT', async () => {
    try {
      if (cached.conn) {
        await mongoose.disconnect();
        console.log('Conexão MongoDB fechada por SIGINT');
      }
      process.exit(0);
    } catch (error) {
      console.error('Erro ao fechar conexão MongoDB:', error);
      process.exit(1);
    }
  });
}

// Adicionar esta declaração para evitar erros de TypeScript
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
} 