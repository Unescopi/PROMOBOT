/**
 * Serviço para geração e gerenciamento de estatísticas
 */

// Interface para estatísticas de campanha
export interface CampaignStatistics {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'scheduled';
  
  // Contadores de mensagens
  total: number;
  sent: number;
  delivered: number;
  read: number;
  responses: number;
  failed: number;
  
  // Taxas
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  
  // Dados temporais para gráficos
  hourlyData?: TimeSeriesData[];
  dailyData?: TimeSeriesData[];
}

// Interface para estatísticas gerais
export interface GlobalStatistics {
  totalContacts: number;
  totalCampaigns: number;
  totalMessages: number;
  activeContacts: number;
  activeCampaigns: number;
  messagesLastWeek: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  lastUpdated?: string;
}

// Interface para dados de séries temporais
export interface TimeSeriesData {
  timestamp: string;
  value: number;
  // Outras propriedades opcionais
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

/**
 * Serviço para geração e gerenciamento de estatísticas
 */
const StatisticsService = {
  /**
   * Obtém estatísticas de uma campanha específica
   */
  getCampaignStatistics: async (campaignId: string): Promise<CampaignStatistics> => {
    try {
      // Buscar dados reais da API
      const response = await fetch(`/api/campanhas/${campaignId}/estatisticas`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao buscar estatísticas da campanha');
      }
      
      const { data } = await response.json();
      
      // Se temos dados reais, retorná-los
      if (data) {
        return {
          id: data.id || campaignId,
          name: data.nome || 'Campanha',
          status: mapStatus(data.status) || 'running',
          startDate: data.criadoEm || new Date().toISOString(),
          endDate: data.terminadoEm,
          
          // Contadores
          total: data.totalMensagens || 0,
          sent: data.mensagensEnviadas || 0,
          delivered: data.mensagensEntregues || 0,
          read: data.mensagensLidas || 0,
          responses: data.mensagensRespondidas || 0,
          failed: data.mensagensFalhas || 0,
          
          // Taxas
          deliveryRate: calculateRate(data.mensagensEntregues, data.mensagensEnviadas),
          readRate: calculateRate(data.mensagensLidas, data.mensagensEntregues),
          responseRate: calculateRate(data.mensagensRespondidas, data.mensagensLidas),
          
          // Dados temporais (manter os dados de exemplo por enquanto)
          hourlyData: data.dadosHorarios || generateHourlyData(),
          dailyData: data.dadosDiarios || generateDailyData(),
        };
      }
      
      // Caso não tenha dados, retornar dados de exemplo com o ID correto
      return {
        id: campaignId,
        name: 'Campanha de Exemplo',
        status: 'running',
        startDate: new Date(Date.now() - 86400000 * 3).toISOString(),
        endDate: undefined,
        
        // Contadores
        total: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        responses: 0,
        failed: 0,
        
        // Taxas
        deliveryRate: 0,
        readRate: 0,
        responseRate: 0,
        
        // Dados temporais
        hourlyData: generateHourlyData(),
        dailyData: generateDailyData(),
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas da campanha:', error);
      throw error;
    }
  },
  
  /**
   * Obtém estatísticas globais de todas as campanhas
   */
  getGlobalStatistics: async (): Promise<GlobalStatistics> => {
    try {
      // Buscar dados reais da API
      const response = await fetch('/api/estatisticas');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar estatísticas');
      }
      
      const { success, data } = await response.json();
      
      if (success && data) {
        return {
          totalContacts: data.totalContacts || 0,
          totalCampaigns: data.totalCampaigns || 0,
          totalMessages: data.totalMessages || 0,
          activeContacts: data.activeContacts || 0,
          activeCampaigns: data.activeCampaigns || 0,
          messagesLastWeek: data.messagesLastWeek || 0,
          deliveryRate: data.deliveryRate || 0,
          readRate: data.readRate || 0,
          responseRate: data.responseRate || 0,
          lastUpdated: data.lastUpdated
        };
      }
      
      // Se não houver dados, retornar zeros
      return {
        totalContacts: 0,
        totalCampaigns: 0,
        totalMessages: 0,
        activeContacts: 0,
        activeCampaigns: 0,
        messagesLastWeek: 0,
        deliveryRate: 0,
        readRate: 0,
        responseRate: 0,
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas globais:', error);
      // Em caso de erro, ainda retornar zeros em vez de falhar
      return {
        totalContacts: 0,
        totalCampaigns: 0,
        totalMessages: 0,
        activeContacts: 0,
        activeCampaigns: 0,
        messagesLastWeek: 0,
        deliveryRate: 0,
        readRate: 0,
        responseRate: 0,
      };
    }
  },
  
  /**
   * Obtém dados para gráfico de mensagens por dia (implementar com dados reais posteriormente)
   */
  getMessagesPerDayChart: async (days: number = 7): Promise<ChartData> => {
    try {
      // Buscar dados reais da API (em uma implementação completa)
      // Por enquanto, verificar se há mensagens para mostrar dados representativos
      const stats = await StatisticsService.getGlobalStatistics();
      
      // Se não houver mensagens, retornar gráfico vazio
      if (!stats.totalMessages) {
        return {
          labels: [],
          datasets: [
            {
              label: 'Mensagens Enviadas',
              data: [],
              backgroundColor: '#3b82f6'
            }
          ]
        };
      }
      
      // Gerar labels para os últimos X dias
      const labels = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      });
      
      // Gerar dados representativos para o gráfico
      // Em uma implementação real, estes viriam da API
      const data = Array.from({ length: days }, () => Math.floor(Math.random() * 300) + 50);
      
      return {
        labels,
        datasets: [
          {
            label: 'Mensagens Enviadas',
            data,
            backgroundColor: '#3b82f6'
          }
        ]
      };
    } catch (error) {
      console.error('Erro ao obter dados de gráfico:', error);
      // Em caso de erro, retornar gráfico vazio
      return {
        labels: [],
        datasets: [
          {
            label: 'Mensagens Enviadas',
            data: [],
            backgroundColor: '#3b82f6'
          }
        ]
      };
    }
  },
  
  /**
   * Obtém dados para gráfico de distribuição de status das mensagens
   */
  getMessageStatusDistribution: async (): Promise<ChartData> => {
    try {
      // Buscar dados reais da API (em uma implementação completa)
      // Por enquanto, verificar se há mensagens para mostrar dados representativos
      const stats = await StatisticsService.getGlobalStatistics();
      
      // Se não houver mensagens, retornar gráfico vazio
      if (!stats.totalMessages) {
        return {
          labels: ['Entregue', 'Lida', 'Respondida', 'Falha'],
          datasets: [
            {
              label: 'Status das Mensagens',
              data: [0, 0, 0, 0],
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
            }
          ]
        };
      }
      
      // Calcular valores baseados nas estatísticas atuais
      const entregues = Math.round(stats.totalMessages * (stats.deliveryRate / 100));
      const lidas = Math.round(entregues * (stats.readRate / 100));
      const respondidas = Math.round(lidas * (stats.responseRate / 100));
      const falhas = stats.totalMessages - entregues;
      
      return {
        labels: ['Entregue', 'Lida', 'Respondida', 'Falha'],
        datasets: [
          {
            label: 'Status das Mensagens',
            data: [entregues, lidas, respondidas, falhas],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
          }
        ]
      };
    } catch (error) {
      console.error('Erro ao obter distribuição de status:', error);
      return {
        labels: ['Entregue', 'Lida', 'Respondida', 'Falha'],
        datasets: [
          {
            label: 'Status das Mensagens',
            data: [0, 0, 0, 0],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
          }
        ]
      };
    }
  },
  
  /**
   * Retorna URL para download de estatísticas em formato CSV
   */
  getExportUrl: (campaignId?: string): string => {
    // Gerar URL para download de estatísticas
    return '/api/download/estatisticas_' + (campaignId || 'global') + '_' + Date.now() + '.csv';
  },
  
  // Dados para representação em gráficos
  getMessageTimeSeriesData: (): TimeSeriesData[] => {
    return [
      { timestamp: '08:00', value: 65, label: 'Manhã' },
      { timestamp: '09:00', value: 128, label: 'Manhã' },
      { timestamp: '10:00', value: 156, label: 'Manhã' },
      { timestamp: '11:00', value: 132, label: 'Manhã' },
      { timestamp: '12:00', value: 85, label: 'Tarde' },
      { timestamp: '13:00', value: 90, label: 'Tarde' },
      { timestamp: '14:00', value: 114, label: 'Tarde' },
      { timestamp: '15:00', value: 142, label: 'Tarde' },
      { timestamp: '16:00', value: 130, label: 'Tarde' },
      { timestamp: '17:00', value: 95, label: 'Tarde' },
    ];
  },
  
  // Dados diários para gráficos
  getDailyMessageData: (): TimeSeriesData[] => {
    return [
      { timestamp: 'Seg', value: 521, label: 'Dia útil' },
      { timestamp: 'Ter', value: 683, label: 'Dia útil' },
      { timestamp: 'Qua', value: 756, label: 'Dia útil' },
      { timestamp: 'Qui', value: 810, label: 'Dia útil' },
      { timestamp: 'Sex', value: 930, label: 'Dia útil' },
      { timestamp: 'Sáb', value: 421, label: 'Fim de semana' },
      { timestamp: 'Dom', value: 330, label: 'Fim de semana' },
    ];
  },
  
  // Gerar dados de mensagens por hora para o gráfico
  getMessagesByHourChart: (): ChartData => {
    return {
      labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      datasets: [
        {
          label: 'Mensagens Enviadas',
          data: [65, 128, 156, 132, 85, 90, 114, 142, 130, 95],
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1
        }
      ]
    };
  },
  
  // Gerar dados de mensagens por dia para o gráfico
  getMessagesByDayChart: (): ChartData => {
    return {
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      datasets: [
        {
          label: 'Mensagens Enviadas',
          data: [521, 683, 756, 810, 930, 421, 330],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'],
          borderColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#4f46e5'],
          borderWidth: 1
        }
      ]
    };
  }
};

// Função auxiliar para mapear status da campanha
function mapStatus(status: string): 'running' | 'paused' | 'completed' | 'cancelled' | 'scheduled' {
  const statusMap: Record<string, 'running' | 'paused' | 'completed' | 'cancelled' | 'scheduled'> = {
    'ativa': 'running',
    'em_andamento': 'running',
    'pausada': 'paused',
    'concluida': 'completed',
    'cancelada': 'cancelled',
    'agendada': 'scheduled',
    'rascunho': 'paused'
  };
  
  return statusMap[status] || 'running';
}

// Função para calcular taxa
function calculateRate(numerator?: number, denominator?: number): number {
  if (!numerator || !denominator || denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

// Gerar dados de hora exemplo
function generateHourlyData(): TimeSeriesData[] {
  return [
    { timestamp: '08:00', value: 65, label: 'Manhã' },
    { timestamp: '09:00', value: 128, label: 'Manhã' },
    { timestamp: '10:00', value: 156, label: 'Manhã' },
    { timestamp: '11:00', value: 132, label: 'Manhã' },
    { timestamp: '12:00', value: 85, label: 'Tarde' },
    { timestamp: '13:00', value: 90, label: 'Tarde' },
    { timestamp: '14:00', value: 114, label: 'Tarde' },
    { timestamp: '15:00', value: 142, label: 'Tarde' },
    { timestamp: '16:00', value: 130, label: 'Tarde' },
    { timestamp: '17:00', value: 95, label: 'Tarde' },
  ];
}

// Gerar dados diários exemplo
function generateDailyData(): TimeSeriesData[] {
  return [
    { timestamp: 'Seg', value: 521, label: 'Dia útil' },
    { timestamp: 'Ter', value: 683, label: 'Dia útil' },
    { timestamp: 'Qua', value: 756, label: 'Dia útil' },
    { timestamp: 'Qui', value: 810, label: 'Dia útil' },
    { timestamp: 'Sex', value: 930, label: 'Dia útil' },
    { timestamp: 'Sáb', value: 421, label: 'Fim de semana' },
    { timestamp: 'Dom', value: 330, label: 'Fim de semana' },
  ];
}

export default StatisticsService; 