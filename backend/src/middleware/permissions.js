/**
 * Middleware para verificar se o usuário tem uma determinada permissão
 * @param {string} area - Área da aplicação (por exemplo, 'campaigns', 'contacts', etc.)
 * @param {string} action - Ação específica ('create', 'read', 'update', 'delete', etc.)
 * @returns {function} - Middleware Express
 */
exports.checkPermission = (area, action) => {
  return async (req, res, next) => {
    // Se não houver usuário autenticado, negar acesso
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. É necessário estar autenticado.'
      });
    }

    // Os administradores têm todas as permissões
    if (req.user.role === 'admin') {
      return next();
    }

    // Verificar se o usuário tem a permissão específica
    const hasPermission = req.user.hasPermission(area, action);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado. Você não tem permissão para ${action} em ${area}.`
      });
    }

    next();
  };
};

/**
 * Middleware para permitir apenas admins ou o próprio usuário
 * @returns {function} - Middleware Express
 */
exports.selfOrAdmin = async (req, res, next) => {
  // Se não houver usuário autenticado, negar acesso
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado. É necessário estar autenticado.'
    });
  }

  // Verificar se o usuário é admin ou o próprio usuário
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.params.id && req.params.id.toString() === req.user._id.toString();

  if (!(isAdmin || isSelf)) {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Você só pode acessar seus próprios recursos, a menos que seja um administrador.'
    });
  }

  next();
};

/**
 * Middleware para verificar múltiplas permissões (todas devem ser verdadeiras)
 * @param {Array} permissions - Array de objetos { area, action }
 * @returns {function} - Middleware Express
 */
exports.checkMultiplePermissions = (permissions) => {
  return async (req, res, next) => {
    // Se não houver usuário autenticado, negar acesso
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. É necessário estar autenticado.'
      });
    }

    // Os administradores têm todas as permissões
    if (req.user.role === 'admin') {
      return next();
    }

    // Verificar todas as permissões
    for (const { area, action } of permissions) {
      const hasPermission = req.user.hasPermission(area, action);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Acesso negado. Você não tem todas as permissões necessárias.`
        });
      }
    }

    next();
  };
};

/**
 * Middleware para verificar se o usuário é ativo
 * @returns {function} - Middleware Express
 */
exports.isActive = async (req, res, next) => {
  // Se não houver usuário autenticado, negar acesso
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado. É necessário estar autenticado.'
    });
  }

  // Verificar se o usuário está ativo
  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: `Sua conta está ${req.user.status}. Entre em contato com o administrador.`
    });
  }

  next();
}; 