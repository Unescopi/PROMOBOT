const mongoose = require('mongoose');

/**
 * Verifica se uma string é um ObjectId válido do MongoDB
 * 
 * @param {string} id - ID a ser validado
 * @returns {boolean} - Verdadeiro se for um ObjectId válido
 */
const validateObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Verifica se um número de telefone está no formato correto
 * 
 * @param {string} phoneNumber - Número de telefone a ser validado
 * @returns {boolean} - Verdadeiro se o formato for válido
 */
const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  // Remove todos os caracteres não numéricos
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Verifica se o número tem entre 10 e 15 dígitos (padrão internacional)
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Verifica se um email está no formato correto
 * 
 * @param {string} email - Email a ser validado
 * @returns {boolean} - Verdadeiro se o formato for válido
 */
const validateEmail = (email) => {
  if (!email) return false;
  
  // Expressão regular para validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida se uma URL está em formato correto
 * 
 * @param {string} url - URL a ser validada
 * @returns {boolean} - Verdadeiro se o formato for válido
 */
const validateUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Valida um objeto de dados contra um schema específico
 * 
 * @param {Object} data - Dados a serem validados
 * @param {Object} schema - Schema de validação (ex: Joi schema)
 * @returns {Object} - Objeto contendo resultado da validação e possíveis erros
 */
const validateSchema = (data, schema) => {
  if (!schema || !schema.validate) {
    throw new Error('Schema de validação inválido');
  }
  
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errorDetails = error.details.map(detail => ({
      message: detail.message,
      path: detail.path,
      type: detail.type
    }));
    
    return {
      isValid: false,
      errors: errorDetails,
      value
    };
  }
  
  return {
    isValid: true,
    value
  };
};

/**
 * Filtra dados para remover campos nulos, undefined ou vazios
 * 
 * @param {Object} data - Dados a serem filtrados
 * @returns {Object} - Dados filtrados
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return {};
  
  const result = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Ignorar valores nulos, undefined ou strings vazias
    if (value !== null && value !== undefined && value !== '') {
      // Para strings, fazer trim
      if (typeof value === 'string') {
        result[key] = value.trim();
      } else {
        result[key] = value;
      }
    }
  });
  
  return result;
};

module.exports = {
  validateObjectId,
  validatePhoneNumber,
  validateEmail,
  validateUrl,
  validateSchema,
  sanitizeData
}; 