import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'promobot';

if (!MONGODB_URI) {
  throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
}

// Configuração do timezone para o Brasil (GMT-3)
process.env.TZ = 'America/Sao_Paulo';
console.log(`Timezone configurado para: ${process.env.TZ}`);
console.log(`Data e hora atual: ${new Date().toISOString()}`);

/**
 * Cache global para a conexão MongoDB
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Conecta ao MongoDB com timeout configurado
 */
export async function connectToDatabase() {
  const timeoutMs = 30000; // 30 segundos
  
  console.log(`Tentando conectar ao MongoDB com timeout de ${timeoutMs}ms`);
  
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs,
      socketTimeoutMS: timeoutMs,
      // Ajusta a forma como o MongoDB lida com datas
      // Força o uso do timezone local
      // startSession: { startDate: new Date() }
    };

    mongoose.set('strictQuery', false);
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB conectado com sucesso');
        return mongoose;
      })
      .catch((error) => {
        console.error('Erro ao conectar ao MongoDB:', error);
        cached.promise = null;
        throw error;
      });
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}

// Adicionar esta declaração para evitar erros de TypeScript
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
} 