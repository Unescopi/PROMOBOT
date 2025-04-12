import React, { useState } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Typography,
  CircularProgress,
  Divider,
  Box,
  Button
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MarkEmailRead as MarkReadIcon,
  DeleteSweep as ClearAllIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearAllNotifications
  } = useNotifications();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    // Marcar como lido
    markAsRead(notification._id);
    
    // Navegar para a página adequada conforme o tipo da notificação
    if (notification.data?.entityId && notification.data?.entityType) {
      switch (notification.data.entityType) {
        case 'message':
          navigate(`/messages/${notification.data.entityId}`);
          break;
        case 'campaign':
          navigate(`/campaigns/${notification.data.entityId}`);
          break;
        case 'contact':
          navigate(`/contacts/${notification.data.entityId}`);
          break;
        default:
          // Se não tiver uma entidade específica, navegar para a página de notificações
          navigate('/notifications');
      }
    } else {
      // Se não tiver dados específicos, navegar para a página de notificações
      navigate('/notifications');
    }
    
    handleMenuClose();
  };

  const handleMarkAllAsRead = (e) => {
    e.stopPropagation();
    markAllAsRead();
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    clearAllNotifications();
  };

  const handleViewAll = () => {
    navigate('/notifications');
    handleMenuClose();
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

  // Formatar data de criação da notificação
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM 'às' HH:mm", { locale: ptBR });
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return dateString;
    }
  };

  const isMenuOpen = Boolean(anchorEl);

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="notificações"
        onClick={handleMenuOpen}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          style: {
            width: 320,
            maxHeight: 450
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notificações</Typography>
          <Box>
            <IconButton 
              size="small" 
              onClick={handleMarkAllAsRead}
              disabled={notifications.length === 0 || unreadCount === 0}
              title="Marcar todas como lidas"
            >
              <MarkReadIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              title="Limpar todas"
            >
              <ClearAllIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <Divider />
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {error && (
          <Box sx={{ p: 2, color: 'error.main' }}>
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
        
        {!loading && !error && notifications.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma notificação disponível
            </Typography>
          </Box>
        )}
        
        {!loading && !error && notifications.length > 0 && (
          <>
            {notifications.slice(0, 5).map((notification) => (
              <MenuItem
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  bgcolor: notification.read ? 'inherit' : 'action.hover',
                  borderLeft: notification.read ? 'none' : '3px solid primary.main'
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography variant="body2" component="span" noWrap>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatDate(notification.createdAt)}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </MenuItem>
            ))}
            
            <Divider />
            
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="text" 
                size="small" 
                onClick={handleViewAll}
                fullWidth
              >
                Ver todas
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationMenu; 