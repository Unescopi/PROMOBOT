import mongoose from 'mongoose';

// URI de conexão do MongoDB
// Em produção, deve ser obtida de variável de ambiente
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/promobot';

// Timeout para conexão (em milissegundos)
const CONNECTION_TIMEOUT = parseInt(process.env.MONGODB_CONNECTION_TIMEOUT || '30000', 10); // 30 segundos por padrão

// Interface para cache de conexão
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastErrorTime?: number; // Hora do último erro para evitar tentativas frequentes
}

// Prevenção para evitar criar múltiplas conexões durante hot-reload em desenvolvimento
const cached: MongooseCache = (global as any).mongoose || { conn: null, promise: null };

if (!(global as any).mongoose) {
  (global as any).mongoose = cached;
}

/**
 * Função para conectar ao banco de dados
 */
export async function connectToDatabase() {
  // Se já existe uma conexão, retorná-la
  if (cached.conn) {
    return cached.conn;
  }
  
  // Se houve um erro recente (nos últimos 10 segundos), não tentar novamente
  // para evitar sobrecarga de tentativas de conexão
  if (cached.lastErrorTime && Date.now() - cached.lastErrorTime < 10000) {
    throw new Error('Conexão com MongoDB falhou recentemente. Aguardando antes de tentar novamente.');
  }

  // Se ainda não iniciou a conexão, iniciar agora
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT,
      connectTimeoutMS: CONNECTION_TIMEOUT,
      socketTimeoutMS: CONNECTION_TIMEOUT,
      family: 4, // Use IPv4, evitando problemas com IPv6
      retryWrites: true,
      w: 'majority', // Requer confirmação da maioria dos servidores
    };

    console.log(`Tentando conectar ao MongoDB com timeout de ${CONNECTION_TIMEOUT}ms`);

    // Criar uma promessa com timeout
    const timeoutPromise = new Promise<typeof mongoose>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout de conexão após ${CONNECTION_TIMEOUT}ms`));
      }, CONNECTION_TIMEOUT);
    });

    // Tentar conectar com timeout
    cached.promise = Promise.race([
      mongoose
        .connect(MONGODB_URI, opts)
        .then((mongoose) => {
          console.log('MongoDB conectado com sucesso');
          // Limpar flag de erro quando conexão bem-sucedida
          cached.lastErrorTime = undefined;
          return mongoose;
        }),
      timeoutPromise
    ]).catch((error) => {
      console.error('Erro ao conectar com MongoDB:', error);
      // Registrar o tempo do erro
      cached.lastErrorTime = Date.now();
      // Limpar a promessa para permitir novas tentativas
      cached.promise = null;
      throw error;
    });
  }

  // Aguardar conexão e retornar
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Adicionar esta declaração para evitar erros de TypeScript
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
} 