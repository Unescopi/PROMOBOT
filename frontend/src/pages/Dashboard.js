import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  useTheme,
  Alert
} from '@mui/material';
import MessageIcon from '@mui/icons-material/Message';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import apiService from '../services/api';

// Componente para cartões de estatísticas
function DashboardCard({ title, value, icon, color, loading, subtitle }) {
  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 140,
        borderTop: `4px solid ${color}`,
      }}
    >
      <Typography component="h2" variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1 }}>
            <Typography component="p" variant="h4">
              {value}
            </Typography>
            {icon && (
              <Box sx={{ color }}>
                {icon}
              </Box>
            )}
          </Box>
          {subtitle && (
            <Typography color="text.secondary" sx={{ flex: 1, fontSize: '0.875rem' }}>
              {subtitle}
            </Typography>
          )}
        </>
      )}
    </Paper>
  );
}

// Componente Dashboard
function Dashboard() {
  const theme = useTheme();
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalContacts: 0,
    deliveredMessages: 0,
    failedMessages: 0
  });
  const [messageStats, setMessageStats] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [recentActivity, setRecentActivity] = useState({
    messages: [],
    contacts: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formatar dados para o gráfico - converte o formato do backend para o formato que o gráfico espera
  const formatChartData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(item => ({
      date: item.date,
      total: item.total || 0,
      delivered: item.delivered || 0, 
      failed: item.failed || 0,
      pending: item.pending || 0
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Buscar estatísticas do dashboard
        const statsData = await apiService.dashboard.getStats();
        console.log('Resposta de estatísticas:', statsData);
        
        if (statsData && statsData.success) {
          setStats({
            totalMessages: Number(statsData.totalMessages) || 0,
            totalContacts: Number(statsData.totalContacts) || 0,
            deliveredMessages: Number(statsData.deliveredMessages) || 0,
            failedMessages: Number(statsData.failedMessages) || 0
          });
        } else {
          console.warn('Formato de resposta inválido para estatísticas do dashboard');
        }

        // 2. Buscar estatísticas de mensagens por período
        const messageStatsData = await apiService.dashboard.getMessageStats({
          days: 7
        });
        console.log('Resposta de estatísticas de mensagens:', messageStatsData);
        
        if (messageStatsData?.success && messageStatsData?.data) {
          // Formatar dados para o gráfico
          setMessageStats(formatChartData(messageStatsData.data));
        } else {
          console.warn('Formato de resposta inválido para estatísticas de mensagens');
        }

        // 3. Buscar atividade recente (campanhas, mensagens, contatos)
        const recentActivityData = await apiService.dashboard.getRecentActivity();
        console.log('Resposta de atividades recentes:', recentActivityData);
        
        if (recentActivityData && recentActivityData.success) {
          if (recentActivityData.campaigns) {
            setCampaigns(recentActivityData.campaigns);
          }
          
          setRecentActivity({
            messages: recentActivityData.messages || [],
            contacts: recentActivityData.contacts || []
          });
        } else {
          console.warn('Formato de resposta inválido para atividade recente');
        }
      } catch (err) {
        console.error('Erro ao buscar dados do dashboard:', err);
        setError('Falha ao carregar dados do dashboard. Verifique a conexão com o servidor.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Função para formatar números
  const formatNumber = (number) => {
    return new Intl.NumberFormat('pt-BR').format(number);
  };

  // Função para formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para formatar telefone
  const formatPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom component="h1">
        Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Cartões de estatísticas */}
        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Total de Mensagens" 
            value={formatNumber(stats.totalMessages)}
            icon={<MessageIcon />} 
            color={theme.palette.primary.main}
            loading={isLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Contatos" 
            value={formatNumber(stats.totalContacts)}
            icon={<PeopleIcon />} 
            color={theme.palette.success.main}
            loading={isLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Entregues" 
            value={formatNumber(stats.deliveredMessages)}
            icon={<CheckCircleIcon />}
            subtitle={stats.totalMessages > 0 ? `${Math.round((stats.deliveredMessages / stats.totalMessages) * 100)}% do total` : '0%'}
            color={theme.palette.info.main}
            loading={isLoading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <DashboardCard 
            title="Falhas" 
            value={formatNumber(stats.failedMessages)}
            icon={<ErrorIcon />}
            subtitle={stats.totalMessages > 0 ? `${Math.round((stats.failedMessages / stats.totalMessages) * 100)}% do total` : '0%'}
            color={theme.palette.error.main}
            loading={isLoading}
          />
        </Grid>

        {/* Gráfico de desempenho dos últimos 7 dias */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 300,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Desempenho de Mensagens (Últimos 7 dias)
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart
                  data={messageStats}
                  margin={{
                    top: 16,
                    right: 16,
                    bottom: 0,
                    left: 24,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    stroke={theme.palette.text.secondary}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    }}
                  />
                  <YAxis
                    stroke={theme.palette.text.secondary}
                  />
                  <Tooltip 
                    formatter={(value) => formatNumber(value)}
                    labelFormatter={(value) => formatDate(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke={theme.palette.primary.main}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="delivered" 
                    name="Entregues"
                    stroke={theme.palette.success.main} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    name="Falhas"
                    stroke={theme.palette.error.main} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Resumo de entrega */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 300,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Resumo de Entregas
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-around' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Entrega
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: '100%',
                        mr: 1,
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'background.paper',
                        position: 'relative',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          bgcolor: stats.totalMessages > 0 ? theme.palette.success.main : theme.palette.grey[300],
                          width: `${stats.totalMessages > 0 ? (stats.deliveredMessages / stats.totalMessages) * 100 : 0}%`,
                          borderRadius: 5,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {stats.totalMessages > 0 ? `${Math.round((stats.deliveredMessages / stats.totalMessages) * 100)}%` : '0%'}
                    </Typography>
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Falha
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: '100%',
                        mr: 1,
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'background.paper',
                        position: 'relative',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          bgcolor: stats.totalMessages > 0 ? theme.palette.error.main : theme.palette.grey[300],
                          width: `${stats.totalMessages > 0 ? (stats.failedMessages / stats.totalMessages) * 100 : 0}%`,
                          borderRadius: 5,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {stats.totalMessages > 0 ? `${Math.round((stats.failedMessages / stats.totalMessages) * 100)}%` : '0%'}
                    </Typography>
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Pendentes
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: '100%',
                        mr: 1,
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'background.paper',
                        position: 'relative',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          bgcolor: theme.palette.warning.main,
                          width: `${stats.totalMessages > 0 ? ((stats.totalMessages - stats.deliveredMessages - stats.failedMessages) / stats.totalMessages) * 100 : 0}%`,
                          borderRadius: 5,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {stats.totalMessages > 0 ? `${Math.round(((stats.totalMessages - stats.deliveredMessages - stats.failedMessages) / stats.totalMessages) * 100)}%` : '0%'}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Mensagens esperando entrega
                  </Typography>
                  <Typography variant="h5" color="text.primary">
                    {formatNumber(stats.totalMessages - stats.deliveredMessages - stats.failedMessages)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Campanhas Recentes
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                <CircularProgress />
              </Box>
            ) : campaigns.length > 0 ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th, & td': {
                      p: 1.5,
                      textAlign: 'left',
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    },
                  }}
                >
                  <Box component="thead">
                    <Box component="tr">
                      <Box component="th">Nome</Box>
                      <Box component="th">Status</Box>
                      <Box component="th">Total de Mensagens</Box>
                      <Box component="th">Entregues</Box>
                      <Box component="th">Taxa de Entrega</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {campaigns.map((campaign) => (
                      <Box component="tr" key={campaign._id || campaign.id}>
                        <Box component="td">{campaign.name}</Box>
                        <Box component="td">
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              color: 'white',
                              bgcolor: 
                                campaign.status === 'active' ? theme.palette.success.main :
                                campaign.status === 'paused' ? theme.palette.warning.main :
                                campaign.status === 'completed' ? theme.palette.info.main :
                                theme.palette.error.main,
                            }}
                          >
                            {campaign.status === 'active' ? 'Ativa' :
                             campaign.status === 'paused' ? 'Pausada' :
                             campaign.status === 'completed' ? 'Concluída' :
                             'Cancelada'}
                          </Box>
                        </Box>
                        <Box component="td">{formatNumber(campaign.totalMessages || 0)}</Box>
                        <Box component="td">{formatNumber(campaign.deliveredMessages || 0)}</Box>
                        <Box component="td">
                          {campaign.totalMessages > 0 
                            ? `${Math.round((campaign.deliveredMessages || 0) / campaign.totalMessages * 100)}%` 
                            : '0%'}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  Nenhuma campanha encontrada
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Nova seção para exibir atividades recentes */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Últimas mensagens */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Mensagens Recentes
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                <CircularProgress />
              </Box>
            ) : recentActivity.messages && recentActivity.messages.length > 0 ? (
              <Box component="ul" sx={{ 
                listStyle: 'none', 
                p: 0, 
                m: 0, 
                maxHeight: 300, 
                overflow: 'auto' 
              }}>
                {recentActivity.messages.map((message) => (
                  <Box 
                    component="li" 
                    key={message._id}
                    sx={{ 
                      p: 1.5, 
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2" component="div">
                        {message.mediaType ? `${message.mediaType.charAt(0).toUpperCase() + message.mediaType.slice(1)}` : 'Texto'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(message.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" noWrap title={message.content}>
                      {message.content?.substring(0, 80)}
                      {message.content?.length > 80 ? '...' : ''}
                    </Typography>
                    {message.campaignId && (
                      <Typography variant="caption" color="text.secondary">
                        Campanha: {message.campaignId.name}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  Nenhuma mensagem recente encontrada
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Últimos contatos */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Contatos Recentes
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                <CircularProgress />
              </Box>
            ) : recentActivity.contacts && recentActivity.contacts.length > 0 ? (
              <Box component="ul" sx={{ 
                listStyle: 'none', 
                p: 0, 
                m: 0,
                maxHeight: 300, 
                overflow: 'auto'
              }}>
                {recentActivity.contacts.map((contact) => (
                  <Box 
                    component="li" 
                    key={contact._id}
                    sx={{ 
                      p: 1.5, 
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2">
                        {contact.name || 'Sem nome'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(contact.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {formatPhone(contact.phone)}
                    </Typography>
                    {contact.tags && contact.tags.length > 0 && (
                      <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {contact.tags.slice(0, 3).map((tag, index) => (
                          <Box
                            key={index}
                            sx={{
                              fontSize: '0.75rem',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              backgroundColor: theme.palette.primary.light,
                              color: theme.palette.primary.contrastText,
                            }}
                          >
                            {tag}
                          </Box>
                        ))}
                        {contact.tags.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{contact.tags.length - 3} mais
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  Nenhum contato recente encontrado
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;