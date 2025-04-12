const { validationResult } = require('express-validator');

/**
 * Middleware para processar erros de validação
 * Deve ser usado após os validadores do express-validator
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação nos dados da requisição',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Função helper para verificar se um valor é um ObjectId válido do MongoDB
 * @param {string} value - Valor a ser verificado
 * @returns {boolean} - True se for um ObjectId válido
 */
exports.isValidObjectId = (value) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(value);
}; 