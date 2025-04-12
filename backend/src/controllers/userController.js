const User = require('../models/User');
const LogService = require('../services/logService');

/**
 * @desc    Obter todos os usuários
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res) => {
  try {
    // Implementar paginação
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments();

    // Obter usuários
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // Resultado com paginação
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
      data: users
    });
  } catch (error) {
    console.error('Erro ao obter usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter usuários',
      error: error.message
    });
  }
};

/**
 * @desc    Obter um usuário específico
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Criar um novo usuário
 * @route   POST /api/users
 * @access  Private/Admin
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, status, permissions } = req.body;

    // Verificar se já existe um usuário com este email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Um usuário com este e-mail já existe'
      });
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      password,
      role,
      status,
      permissions
    });

    // Registrar log
    await LogService.createLog({
      userId: req.user._id,
      action: 'create_user',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${req.user.name} criou um novo usuário: ${name} (${email})`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        role,
        status
      }
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'Usuário criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar um usuário
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, status, permissions } = req.body;

    // Verificar se já existe outro usuário com este email
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Este e-mail já está em uso por outro usuário'
        });
      }
    }

    // Campos a atualizar
    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (email) fieldsToUpdate.email = email;
    if (role) fieldsToUpdate.role = role;
    if (status) fieldsToUpdate.status = status;
    if (permissions) fieldsToUpdate.permissions = permissions;

    // Atualizar usuário
    const user = await User.findByIdAndUpdate(
      req.params.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Registrar log
    await LogService.createLog({
      userId: req.user._id,
      action: 'update_user',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${req.user.name} atualizou o usuário: ${user.name} (${user.email})`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        updatedFields: Object.keys(fieldsToUpdate)
      }
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'Usuário atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Deletar um usuário
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Não permitir que um admin delete a si mesmo
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode deletar seu próprio usuário'
      });
    }

    // Registrar log antes de deletar
    await LogService.createLog({
      userId: req.user._id,
      action: 'delete_user',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${req.user.name} deletou o usuário: ${user.name} (${user.email})`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar senha de um usuário (admin)
 * @route   PUT /api/users/:id/password
 * @access  Private/Admin
 */
exports.updateUserPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'A senha é obrigatória'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Atualizar senha
    user.password = password;
    await user.save();

    // Registrar log
    await LogService.createLog({
      userId: req.user._id,
      action: 'update_password',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${req.user.name} atualizou a senha do usuário: ${user.name} (${user.email})`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Senha atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar senha do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar senha do usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar status do usuário
 * @route   PUT /api/users/:id/status
 * @access  Private/Admin
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Deve ser active, inactive, suspended ou pending.'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Não permitir alterar o status do próprio usuário
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode alterar o status do seu próprio usuário'
      });
    }

    // Atualizar status
    user.status = status;
    await user.save();

    // Registrar log
    await LogService.createLog({
      userId: req.user._id,
      action: 'update_user_status',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${req.user.name} alterou o status do usuário ${user.name} para ${status}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { 
        oldStatus: user.status,
        newStatus: status
      }
    });

    res.status(200).json({
      success: true,
      data: user,
      message: `Status do usuário atualizado para ${status}`
    });
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status do usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Atualizar permissões do usuário
 * @route   PUT /api/users/:id/permissions
 * @access  Private/Admin
 */
exports.updateUserPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Permissões inválidas. Forneça um objeto de permissões.'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Não permitir alterar as permissões do próprio usuário se for admin
    if (user._id.toString() === req.user.id && user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Você não pode alterar as permissões do seu próprio usuário sendo administrador'
      });
    }

    // Salvar permissões antigas para o log
    const oldPermissions = JSON.parse(JSON.stringify(user.permissions || {}));

    // Mesclar as permissões atuais com as novas
    user.permissions = {
      ...user.permissions,
      ...permissions
    };

    await user.save();

    // Registrar log
    await LogService.createLog({
      userId: req.user._id,
      action: 'update_user_permissions',
      entity: 'user',
      entityId: user._id,
      description: `Usuário ${req.user.name} atualizou as permissões do usuário ${user.name}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { 
        oldPermissions,
        newPermissions: user.permissions
      }
    });

    res.status(200).json({
      success: true,
      data: user,
      message: 'Permissões do usuário atualizadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar permissões do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar permissões do usuário',
      error: error.message
    });
  }
}; 