const User = require('../models/User');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const LogService = require('../services/logService');

/**
 * @desc    Registrar um novo usuário
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Um usuário com este e-mail já existe'
      });
    }

    // Criar o usuário - se role não for especificado, será 'user' por padrão
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    // Registrar log de registro
    await LogService.createLog({
      userId: user._id,
      action: 'register',
      entity: 'user',
      entityId: user._id,
      description: `Novo usuário ${name} (${email}) registrado no sistema`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Enviar resposta com token
    sendTokenResponse(user, 201, res, 'Usuário registrado com sucesso');
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Login de usuário
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar se o email e senha foram fornecidos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça email e senha'
      });
    }

    // Verificar se o usuário existe
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Verificar se a conta está ativa
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: `Sua conta está ${user.status === 'suspended' ? 'suspensa' : 'inativa'}. Entre em contato com o administrador.`
      });
    }

    // Verificar se a senha corresponde
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Atualizar data do último login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Registrar log de login
    await LogService.createLog({
      userId: user._id,
      action: 'login',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${user.name} (${user.email}) realizou login`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Enviar resposta com token
    sendTokenResponse(user, 200, res, 'Login realizado com sucesso');
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
};

/**
 * @desc    Obter usuário atualmente logado
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar detalhes do usuário
 * @route   PUT /api/auth/updatedetails
 * @access  Private
 */
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    // Registrar log de atualização de perfil
    await LogService.createLog({
      userId: req.user._id,
      action: 'update_profile',
      entity: 'user',
      entityId: req.user._id,
      description: `Usuário ${user.name} atualizou seu perfil`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { 
        updatedFields: Object.keys(fieldsToUpdate).filter(key => fieldsToUpdate[key] !== undefined)
      }
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'Detalhes atualizados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar senha
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verificar senha atual
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se a senha atual está correta
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Definir nova senha
    user.password = newPassword;
    await user.save();

    // Registrar log de atualização de senha
    await LogService.createLog({
      userId: req.user._id,
      action: 'update_password',
      entity: 'user',
      entityId: req.user._id,
      description: `Usuário ${user.name} alterou sua senha`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    sendTokenResponse(user, 200, res, 'Senha atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar senha',
      error: error.message
    });
  }
};

/**
 * @desc    Esqueci minha senha
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Não há usuário com esse e-mail'
      });
    }

    // Gerar token de redefinição
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash do token e definir data de expiração (10min)
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Registrar log de solicitação de redefinição de senha
    await LogService.createLog({
      userId: user._id,
      action: 'forgot_password',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${user.name} solicitou redefinição de senha`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Na implementação real, aqui enviariamos um email com o link
    // Mas para fins de demo, apenas retornamos o token
    res.status(200).json({
      success: true,
      resetToken,
      message: 'Token de redefinição de senha enviado'
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de recuperação:', error);
    
    // Se houver erro, limpar os campos de reset
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao enviar e-mail de recuperação',
      error: error.message
    });
  }
};

/**
 * @desc    Redefinir senha
 * @route   PUT /api/auth/resetpassword/:resettoken
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  try {
    // Obter token e hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    // Procurar usuário pelo token e verificar validade
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }

    // Definir nova senha
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Registrar log de redefinição de senha
    await LogService.createLog({
      userId: user._id,
      action: 'reset_password',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${user.name} redefiniu sua senha`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    sendTokenResponse(user, 200, res, 'Senha redefinida com sucesso');
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao redefinir senha',
      error: error.message
    });
  }
};

/**
 * @desc    Logout / limpar cookie
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // Registrar log de logout
    if (req.user) {
      await LogService.createLog({
        userId: req.user._id,
        action: 'logout',
        entity: 'user',
        entityId: req.user._id,
        description: `Usuário ${req.user.name} fez logout`,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    
    // Mesmo com erro, tentamos limpar o cookie e retornar sucesso
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  }
};

/**
 * Função auxiliar para gerar token e enviar resposta
 */
const sendTokenResponse = (user, statusCode, res, message) => {
  // Criar token
  const token = user.getSignedJwtToken();

  // Opções de cookie
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // Usar HTTPS em produção
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions
      },
      message
    });
}; 