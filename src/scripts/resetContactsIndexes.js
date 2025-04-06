// Script para redefinir índices da coleção de contatos
const mongoose = require('mongoose');
require('dotenv').config();

async function resetIndexes() {
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

    // Obter a coleção de contatos
    const db = mongoose.connection.db;
    console.log('Acessando coleção de contatos...');
    
    try {
      // Tentar remover a coleção se ela existir
      await db.collection('contatos').drop();
      console.log('Coleção de contatos removida com sucesso!');
    } catch (error) {
      console.log('A coleção não existe ou não pôde ser removida');
    }
    
    // Recriar índices
    console.log('Importando modelo para recriar a estrutura...');
    require('../models/Contato');
    console.log('Modelo importado, índices serão criados na próxima operação');
    
    console.log('Operação concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao redefinir índices:', error);
  } finally {
    // Fechar conexão
    await mongoose.connection.close();
    console.log('Conexão fechada');
    process.exit(0);
  }
}

resetIndexes(); 