const rateLimit = require('express-rate-limit');

/**
 * Configurações padrão de rate limit para a API
 */
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  standardHeaders: true, // Retorna os headers 'RateLimit-*' para informar o cliente
  legacyHeaders: false, // Desabilita os headers 'X-RateLimit-*'
  message: {
    success: false,
    message: 'Muitas requisições deste IP, por favor tente novamente após 15 minutos'
  },
  skipSuccessfulRequests: false, // Conta todas as requisições, mesmo as bem-sucedidas
  // Permitir que APIs internas ignorem o limite usando uma chave
  keyGenerator: (req) => {
    // Se a requisição tem a chave API interna, não limita
    if (req.headers['x-api-internal-key'] === process.env.INTERNAL_API_KEY) {
      return 'internal-bypass';
    }
    return req.ip;
  }
});

/**
 * Rate limit mais rigoroso para rotas sensíveis (ex: autenticação)
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas de autenticação, por favor tente novamente após 1 hora'
  },
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
  keyGenerator: (req) => {
    if (req.headers['x-api-internal-key'] === process.env.INTERNAL_API_KEY) {
      return 'internal-bypass';
    }
    return req.ip;
  }
});

/**
 * Rate limit para envio de mensagens para evitar spam/abuso
 * (apenas para requisições de usuários via API)
 */
const messagingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 200, // Aumentado para 200 mensagens por IP (era 50)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Limite de envio de mensagens atingido, por favor tente novamente após 10 minutos'
  },
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    if (req.headers['x-api-internal-key'] === process.env.INTERNAL_API_KEY) {
      return 'internal-bypass';
    }
    return req.ip;
  }
});

/**
 * Rate limit para API externa (Evolution API)
 */
const evolutionApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 100, // Aumentado para 100 requisições por IP (era 30)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições para a API externa, por favor tente novamente após 5 minutos'
  },
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    if (req.headers['x-api-internal-key'] === process.env.INTERNAL_API_KEY) {
      return 'internal-bypass';
    }
    return req.ip;
  }
});

/**
 * Função para verificar se a requisição é interna (feita pelo próprio servidor)
 * Útil para ignorar o rate limiting em processos em lote
 * @param {Object} req - Request do Express
 * @returns {boolean} Verdadeiro se for requisição interna
 */
function isInternalRequest(req) {
  return req.headers['x-api-internal-key'] === process.env.INTERNAL_API_KEY;
}

module.exports = {
  defaultLimiter,
  authLimiter,
  messagingLimiter,
  evolutionApiLimiter,
  isInternalRequest
}; 