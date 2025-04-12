const mongoose = require('mongoose');
require('dotenv').config();

// Função para conectar ao MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado com sucesso');
  } catch (error) {
    console.error('Erro ao conectar no MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB; 