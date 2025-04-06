// Script para remover índices problemáticos no MongoDB Atlas
const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndices() {
  try {
    // Conectar ao MongoDB Atlas
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('Erro: Variável de ambiente MONGODB_URI não encontrada');
      process.exit(1);
    }
    
    console.log('Conectando ao MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado com sucesso ao MongoDB Atlas!');

    // Obter a conexão e acessar a coleção diretamente
    const db = mongoose.connection.db;
    const contatosCollection = db.collection('contatos');
    
    console.log('Verificando índices existentes...');
    const indices = await contatosCollection.indexes();
    console.log('Índices encontrados:', indices);
    
    // Remover todos os índices, exceto o _id que é padrão
    for (const index of indices) {
      // Pular o índice _id que é padrão e não pode ser removido
      if (index.name === '_id_') continue;
      
      console.log(`Removendo índice "${index.name}"...`);
      await contatosCollection.dropIndex(index.name);
      console.log(`Índice "${index.name}" removido com sucesso!`);
    }
    
    // Criar novos índices que são seguros
    console.log('Criando novos índices básicos...');
    await contatosCollection.createIndex({ nome: 1 });
    await contatosCollection.createIndex({ telefone: 1 });
    await contatosCollection.createIndex({ email: 1 });
    console.log('Novos índices criados com sucesso!');
    
    console.log('Operação concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao corrigir índices:', error);
  } finally {
    // Fechar conexão
    try {
      await mongoose.connection.close();
      console.log('Conexão fechada');
    } catch (err) {
      console.error('Erro ao fechar conexão:', err);
    }
    process.exit(0);
  }
}

fixIndices(); 