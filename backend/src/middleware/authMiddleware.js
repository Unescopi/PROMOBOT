const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware de autenticação
 * Verifica se o usuário está autenticado através do token JWT
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Verificar se o token foi fornecido
    let token;
    
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extrair o token do header Authorization
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      // Ou extrair dos cookies
      token = req.cookies.token;
    }
    
    // Se não houver token, retornar erro de autenticação
    if (!token) {
      return res.status(401).json({
        message: 'Acesso negado. Autenticação necessária.'
      });
    }
    
    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar o usuário pelo ID decodificado do token
    const user = await User.findById(decoded.id).select('-password');
    
    // Se o usuário não existir, retornar erro
    if (!user) {
      return res.status(401).json({
        message: 'Usuário não encontrado ou token inválido.'
      });
    }
    
    // Adicionar o usuário à requisição para uso em outras partes da aplicação
    req.user = user;
    
    // Continuar para o próximo middleware
    next();
  } catch (error) {
    logger.error('Erro de autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Token inválido.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado. Faça login novamente.'
      });
    }
    
    res.status(500).json({
      message: 'Erro interno no servidor durante autenticação.'
    });
  }
};

module.exports = authMiddleware; 