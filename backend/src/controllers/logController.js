const LogService = require('../services/logService');
const Log = require('../models/Log');

/**
 * @desc    Obter todos os logs com paginação e filtros
 * @route   GET /api/logs
 * @access  Private/Admin
 */
exports.getLogs = async (req, res) => {
  try {
    // Extrair parâmetros de paginação e filtros da query
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    
    // Construir objeto de filtros avançados
    const advancedFilter = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      userId: req.query.userId,
      actions: req.query.actions ? req.query.actions.split(',') : null,
      entities: req.query.entities ? req.query.entities.split(',') : null,
      entityId: req.query.entityId,
      searchTerm: req.query.search
    };

    // Obter logs com filtros avançados
    const result = await LogService.getLogsWithAdvancedFilter(
      advancedFilter, 
      { 
        page, 
        limit, 
        sort: { createdAt: -1 } 
      }
    );

    res.status(200).json({
      success: true,
      count: result.logs.length,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      },
      data: result.logs
    });
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter logs',
      error: error.message
    });
  }
};

/**
 * @desc    Obter logs de um usuário específico
 * @route   GET /api/logs/user/:userId
 * @access  Private/Admin
 */
exports.getUserLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    
    const result = await LogService.getUserLogs(
      req.params.userId,
      { 
        page, 
        limit, 
        sort: { createdAt: -1 } 
      }
    );

    res.status(200).json({
      success: true,
      count: result.logs.length,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      },
      data: result.logs
    });
  } catch (error) {
    console.error('Erro ao obter logs do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter logs do usuário',
      error: error.message
    });
  }
};

/**
 * @desc    Obter minhas atividades (logs do usuário logado)
 * @route   GET /api/logs/me
 * @access  Private
 */
exports.getMyLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    
    const result = await LogService.getUserLogs(
      req.user.id,
      { 
        page, 
        limit, 
        sort: { createdAt: -1 } 
      }
    );

    res.status(200).json({
      success: true,
      count: result.logs.length,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      },
      data: result.logs
    });
  } catch (error) {
    console.error('Erro ao obter minhas atividades:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter minhas atividades',
      error: error.message
    });
  }
};

/**
 * @desc    Obter logs por tipo de ação
 * @route   GET /api/logs/action/:action
 * @access  Private/Admin
 */
exports.getActionLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    
    const result = await LogService.getActionLogs(
      req.params.action,
      { 
        page, 
        limit, 
        sort: { createdAt: -1 } 
      }
    );

    res.status(200).json({
      success: true,
      count: result.logs.length,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      },
      data: result.logs
    });
  } catch (error) {
    console.error('Erro ao obter logs por ação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter logs por ação',
      error: error.message
    });
  }
};

/**
 * @desc    Obter logs de entidade específica
 * @route   GET /api/logs/entity/:entityType/:entityId
 * @access  Private/Admin
 */
exports.getEntityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    
    const result = await LogService.getEntityLogs(
      req.params.entityId,
      req.params.entityType,
      { 
        page, 
        limit, 
        sort: { createdAt: -1 } 
      }
    );

    res.status(200).json({
      success: true,
      count: result.logs.length,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      },
      data: result.logs
    });
  } catch (error) {
    console.error('Erro ao obter logs da entidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter logs da entidade',
      error: error.message
    });
  }
};

/**
 * @desc    Obter estatísticas de atividades
 * @route   GET /api/logs/stats
 * @access  Private/Admin
 */
exports.getActivityStats = async (req, res) => {
  try {
    // Parâmetros para filtro de período
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 dias por padrão
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Obter estatísticas por tipo de ação
    const actionStats = await Log.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Obter estatísticas por entidade
    const entityStats = await Log.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: '$entity',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Obter estatísticas por usuário (top 10)
    const userStats = await Log.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          'userDetails.name': 1,
          'userDetails.email': 1
        }
      }
    ]);

    // Obter atividade diária no período
    const dailyActivity = await Log.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        actionStats,
        entityStats,
        userStats,
        dailyActivity,
        period: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de atividades:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de atividades',
      error: error.message
    });
  }
}; 