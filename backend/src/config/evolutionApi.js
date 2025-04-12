const axios = require('axios');
require('dotenv').config();

// Configuração base do axios para a Evolution API
const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.EVOLUTION_API_KEY
  }
});

// Middleware para lidar com erros de requisição
evolutionApi.interceptors.response.use(
  response => response,
  error => {
    console.error('Erro na requisição para Evolution API:', error.message);
    return Promise.reject(error);
  }
);

module.exports = evolutionApi; 