import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List,
  ListItem,
  ListItemText, 
  ListItemIcon,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Tab,
  Tabs,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  DeleteSweep as ClearAllIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotifications } from '../contexts/NotificationContext';
import { useSnackbar } from 'notistack';

const NotificationsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExpandToggle = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleMarkAsRead = (id) => {
    markAsRead(id);
    enqueueSnackbar('Notificação marcada como lida', { variant: 'success' });
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    enqueueSnackbar('Todas as notificações foram marcadas como lidas', { variant: 'success' });
  };

  const handleDeleteNotification = (id) => {
    deleteNotification(id);
    enqueueSnackbar('Notificação removida', { variant: 'success' });
  };

  const handleClearAllNotifications = () => {
    clearAllNotifications();
    enqueueSnackbar('Todas as notificações foram removidas', { variant: 'success' });
  };

  // Função para obter as notificações filtradas com base na tab selecionada
  const getFilteredNotifications = () => {
    switch (tabValue) {
      case 0: // Todas
        return notifications;
      case 1: // Não lidas
        return notifications.filter(notification => !notification.read);
      case 2: // Lidas
        return notifications.filter(notification => notification.read);
      default:
        return notifications;
    }
  };

  // Função para obter o ícone baseado no tipo de notificação
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'success':
        return <SuccessIcon color="success" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // Função para obter a cor do chip baseado no tipo de notificação
  const getNotificationChipColor = (type) => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  // Formatar data de criação da notificação
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return dateString;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Notificações
        </Typography>
        
        <Paper sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Tabs value={tabValue} onChange={handleChangeTab}>
              <Tab label="Todas" />
              <Tab 
                label="Não lidas" 
                icon={unreadCount > 0 ? <Badge badgeContent={unreadCount} color="error" /> : null}
                iconPosition="end"
              />
              <Tab label="Lidas" />
            </Tabs>
            
            <Box>
              <Tooltip title="Marcar todas como lidas">
                <IconButton 
                  onClick={handleMarkAllAsRead} 
                  disabled={unreadCount === 0}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  <MarkReadIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Limpar todas">
                <IconButton 
                  onClick={handleClearAllNotifications}
                  disabled={notifications.length === 0}
                  size="small"
                >
                  <ClearAllIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Divider />
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {error && (
            <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
              <Typography>{error}</Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={fetchNotifications}
                sx={{ mt: 2 }}
              >
                Tentar novamente
              </Button>
            </Box>
          )}
          
          {!loading && !error && filteredNotifications.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                Nenhuma notificação disponível
              </Typography>
            </Box>
          )}
          
          {!loading && !error && filteredNotifications.length > 0 && (
            <List>
              {filteredNotifications.map((notification) => (
                <React.Fragment key={notification._id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{
                      bgcolor: notification.read ? 'inherit' : 'action.hover',
                      borderLeft: notification.read ? 'none' : '4px solid',
                      borderLeftColor: 'primary.main',
                      py: 2
                    }}
                  >
                    <ListItemIcon sx={{ mt: 0 }}>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="subtitle1" component="div" sx={{ fontWeight: notification.read ? 'normal' : 'bold', mr: 1 }}>
                            {notification.title}
                          </Typography>
                          <Chip 
                            label={notification.type || 'info'} 
                            color={getNotificationChipColor(notification.type)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            component="div"
                            sx={{ 
                              mb: 1,
                              // Se expandido, mostrar tudo, caso contrário limitar a 2 linhas
                              display: expandedId === notification._id ? 'block' : '-webkit-box',
                              WebkitLineClamp: expandedId === notification._id ? 'unset' : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {notification.message}
                          </Typography>
                          
                          {notification.message && notification.message.length > 100 && (
                            <Button 
                              size="small" 
                              onClick={() => handleExpandToggle(notification._id)}
                              sx={{ mb: 1 }}
                            >
                              {expandedId === notification._id ? 'Ver menos' : 'Ver mais'}
                            </Button>
                          )}
                          
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDate(notification.createdAt)}
                          </Typography>
                          
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            {!notification.read && (
                              <Button 
                                size="small" 
                                startIcon={<MarkReadIcon />} 
                                onClick={() => handleMarkAsRead(notification._id)}
                              >
                                Marcar como lida
                              </Button>
                            )}
                            
                            <Button 
                              size="small" 
                              startIcon={<DeleteIcon />} 
                              color="error"
                              onClick={() => handleDeleteNotification(notification._id)}
                            >
                              Remover
                            </Button>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default NotificationsPage; 