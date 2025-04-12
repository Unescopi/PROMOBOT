const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware de proteção de rotas que requer autenticação
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Verificar se o token existe no header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Verificar se o token existe em cookies (alternativa)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Se não há token, retornar erro
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. É necessário estar autenticado.'
      });
    }

    try {
      // Verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Adicionar o usuário à requisição
      req.user = await User.findById(decoded.id);
      
      // Se o usuário não existir
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'O usuário desta sessão não foi encontrado'
        });
      }
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor',
      error: error.message
    });
  }
}; 