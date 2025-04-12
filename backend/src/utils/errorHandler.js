const logger = require('./logger');
const mongoose = require('mongoose');

/**
 * Função para padronizar o tratamento de erros na API
 * 
 * @param {Object} res - Objeto de resposta do Express
 * @param {Error} error - Erro a ser tratado
 * @param {string} customMessage - Mensagem personalizada opcional
 */
const handleError = (res, error, customMessage = '') => {
  // Registrar erro no log
  logger.error(`${customMessage} ${error.message}`, { 
    stack: error.stack, 
    statusCode: error.statusCode || 500
  });
  
  // Erros de validação do Mongoose
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ 
      error: 'Erro de validação', 
      details: Object.values(error.errors).map(err => err.message)
    });
  }
  
  // Erros de cast do Mongoose (conversão de tipos)
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ 
      error: 'Dados inválidos', 
      details: `O valor '${error.value}' não é válido para o campo '${error.path}'` 
    });
  }
  
  // Erro de duplicação (unique constraint)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return res.status(409).json({ 
      error: 'Conflito de dados', 
      details: `O valor '${value}' já está em uso para o campo '${field}'` 
    });
  }
  
  // Erros personalizados com código de status
  if (error.statusCode) {
    return res.status(error.statusCode).json({ 
      error: error.message || 'Erro na requisição'
    });
  }
  
  // Erro padrão do servidor
  return res.status(500).json({ 
    error: customMessage || 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
};

/**
 * Cria um erro personalizado com código de status
 * 
 * @param {string} message - Mensagem de erro
 * @param {number} statusCode - Código de status HTTP
 * @returns {Error} Erro personalizado
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Middleware para tratar erros assíncronos no Express
 * 
 * @param {Function} fn - Função de middleware/controlador assíncrona
 * @returns {Function} Middleware com tratamento de erro
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    handleError(res, error);
  });
};

/**
 * Middleware para validar IDs MongoDB
 * 
 * @param {string} idParam - Nome do parâmetro que contém o ID
 * @returns {Function} Middleware de validação
 */
const validateObjectId = (idParam = 'id') => (req, res, next) => {
  const id = req.params[idParam];
  
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ 
      error: 'ID inválido',
      details: `O ID '${id}' fornecido não é válido` 
    });
  }
  
  next();
};

module.exports = {
  handleError,
  createError,
  asyncHandler,
  validateObjectId
}; 