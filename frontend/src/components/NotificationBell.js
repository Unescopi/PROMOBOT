import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Campaign as CampaignIcon
} from '@mui/icons-material';
import apiService from '../services/api';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [soundEffects] = useState({
    success: new Audio('/sounds/success.mp3'),
    error: new Audio('/sounds/error.mp3'),
    warning: new Audio('/sounds/warning.mp3'),
    info: new Audio('/sounds/info.mp3'),
    message: new Audio('/sounds/message.mp3')
  });

  useEffect(() => {
    loadNotifications();
    // Configurar WebSocket ou polling para atualizações em tempo real
    const interval = setInterval(loadNotifications, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await apiService.notifications.getHistory();
      const newNotifications = response.data || [];
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await apiService.notifications.markAsRead(notification.id);
        loadNotifications();
      }
      // Navegar para a página relevante se necessário
      if (notification.link) {
        window.location.href = notification.link;
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const playNotificationSound = (type) => {
    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    if (settings.enableSoundEffects) {
      const sound = soundEffects[type] || soundEffects.info;
      sound.play().catch(error => console.error('Erro ao tocar som:', error));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'success':
        return <SuccessIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'campaign':
        return <CampaignIcon color="primary" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes/60)}h atrás`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: '350px',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Notificações
            {unreadCount > 0 && (
              <Chip
                size="small"
                color="primary"
                label={`${unreadCount} nova${unreadCount > 1 ? 's' : ''}`}
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </Box>

        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Nenhuma notificação"
                secondary="Você está em dia!"
              />
            </ListItem>
          ) : (
            notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                  }}
                >
                  <ListItemIcon>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.message}
                    secondary={formatNotificationTime(notification.createdAt)}
                    primaryTypographyProps={{
                      variant: 'body2',
                      color: notification.read ? 'text.primary' : 'primary',
                    }}
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Menu>
    </>
  );
};

export default NotificationBell; 