const Message = require('../models/Message');
const Contact = require('../models/Contact');
const Campaign = require('../models/Campaign');
const MessageStatus = require('../models/MessageStatus');

/**
 * @desc    Obter estatísticas para o dashboard
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
exports.getStats = async (req, res) => {
  try {
    // Contar total de mensagens (usando MessageStatus para maior precisão)
    const messageStats = await MessageStatus.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Inicializar contadores
    let totalMessages = 0;
    let deliveredMessages = 0;
    let failedMessages = 0;

    // Processar estatísticas
    messageStats.forEach(stat => {
      totalMessages += stat.count;
      if (['delivered', 'sent', 'read', 'received'].includes(stat._id)) {
        deliveredMessages += stat.count;
      } else if (['failed', 'error', 'rejected', 'blocked'].includes(stat._id)) {
        failedMessages += stat.count;
      }
    });
    
    // Contar total de contatos
    const totalContacts = await Contact.countDocuments();

    // Validar dados antes de enviar
    const response = {
      success: true,
      totalMessages: Math.max(0, totalMessages),
      totalContacts: Math.max(0, totalContacts),
      deliveredMessages: Math.max(0, deliveredMessages),
      failedMessages: Math.max(0, failedMessages)
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao obter estatísticas do dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas do dashboard',
      error: error.message
    });
  }
};

/**
 * @desc    Obter estatísticas de mensagens por período
 * @route   GET /api/dashboard/message-stats
 * @access  Private
 */
exports.getMessageStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Calcular data de início (últimos X dias) no fuso horário do Brasil
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 3); // Ajusta para UTC-3 (Brasil)
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    // Agregar mensagens por dia
    const messageStats = await MessageStatus.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { 
              $dateToString: { 
                format: '%Y-%m-%d', 
                date: { 
                  $add: ['$createdAt', 3 * 60 * 60 * 1000] // Ajusta para UTC-3
                } 
              } 
            },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
    
    // Formatar dados para o frontend
    const formattedStats = {};
    
    // Inicializar para cada dia no fuso horário do Brasil
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date();
      date.setHours(date.getHours() - 3); // Ajusta para UTC-3
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      formattedStats[dateStr] = {
        date: dateStr,
        delivered: 0,
        failed: 0,
        pending: 0,
        total: 0
      };
    }
    
    // Preencher com dados reais
    messageStats.forEach(stat => {
      const { date, status } = stat._id;
      const count = stat.count;
      
      if (formattedStats[date]) {
        if (['delivered', 'sent', 'read', 'received'].includes(status)) {
          formattedStats[date].delivered += count;
        } else if (['failed', 'error', 'rejected', 'blocked'].includes(status)) {
          formattedStats[date].failed += count;
        } else if (['pending', 'queued', 'processing'].includes(status)) {
          formattedStats[date].pending += count;
        }
        
        formattedStats[date].total += count;
      }
    });
    
    // Converter para array e ordenar por data
    const result = Object.values(formattedStats).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de mensagens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de mensagens',
      error: error.message
    });
  }
};

/**
 * @desc    Obter atividade recente
 * @route   GET /api/dashboard/recent-activity
 * @access  Private
 */
exports.getRecentActivity = async (req, res) => {
  try {
    // Obter campanhas recentes com contagem de mensagens
    const recentCampaigns = await Campaign.aggregate([
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'campaignId',
          as: 'messages'
        }
      },
      {
        $lookup: {
          from: 'messagestatuses',
          localField: '_id',
          foreignField: 'campaignId',
          as: 'messageStatuses'
        }
      },
      {
        $project: {
          name: 1,
          status: 1,
          createdAt: { 
            $add: ['$createdAt', 3 * 60 * 60 * 1000] // Ajusta para UTC-3
          },
          totalMessages: { $size: '$messages' },
          deliveredMessages: {
            $size: {
              $filter: {
                input: '$messageStatuses',
                as: 'status',
                cond: { $in: ['$$status.status', ['delivered', 'sent', 'read', 'received']] }
              }
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 5
      }
    ]);
      
    // Obter mensagens recentes
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('content type campaignId createdAt')
      .populate('campaignId', 'name');
      
    // Obter contatos recentes
    const recentContacts = await Contact.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name phone tags createdAt');
      
    res.status(200).json({
      success: true,
      campaigns: recentCampaigns,
      messages: recentMessages,
      contacts: recentContacts
    });
  } catch (error) {
    console.error('Erro ao obter atividade recente:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter atividade recente',
      error: error.message
    });
  }
}; 