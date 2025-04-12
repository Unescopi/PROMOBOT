import { useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useSnackbar } from 'notistack';

/**
 * Hook para mostrar notificações na interface
 */
export const useNotificationDisplay = () => {
  const { notifications, markAsRead } = useNotifications();
  const { enqueueSnackbar } = useSnackbar();
  
  // Mostrar snackbars para novas notificações
  useEffect(() => {
    // Filtrar apenas notificações não lidas
    const unreadNotifications = notifications.filter(notification => !notification.read);
    
    // Mostrar as últimas 3 notificações não lidas
    unreadNotifications.slice(0, 3).forEach(notification => {
      // Definir a variante com base no tipo da notificação
      let variant = 'info';
      switch (notification.type) {
        case 'error':
          variant = 'error';
          break;
        case 'warning':
          variant = 'warning';
          break;
        case 'success':
          variant = 'success';
          break;
        default:
          variant = 'info';
      }
      
      // Mostrar a notificação como snackbar
      enqueueSnackbar(notification.title, { 
        variant,
        autoHideDuration: 5000,
        action: (key) => (
          <button 
            onClick={() => {
              markAsRead(notification._id);
            }}
            style={{
              backgroundColor: 'transparent',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
              marginLeft: '10px'
            }}
          >
            Fechar
          </button>
        )
      });
      
      // Marcar como lida após exibir
      setTimeout(() => {
        markAsRead(notification._id);
      }, 5000);
    });
  }, [notifications, markAsRead, enqueueSnackbar]);
  
  return null;
};

/**
 * Função para criar tipos específicos de notificações
 */
export const createNotificationTypes = (addNotification) => {
  return {
    // Notificação de sucesso
    success: (title, message = '', data = {}) => {
      addNotification({
        type: 'success',
        title,
        message,
        data,
        read: false
      });
    },
    
    // Notificação de erro
    error: (title, message = '', data = {}) => {
      addNotification({
        type: 'error',
        title,
        message,
        data,
        read: false
      });
    },
    
    // Notificação de alerta
    warning: (title, message = '', data = {}) => {
      addNotification({
        type: 'warning',
        title,
        message,
        data,
        read: false
      });
    },
    
    // Notificação informativa
    info: (title, message = '', data = {}) => {
      addNotification({
        type: 'info',
        title,
        message,
        data,
        read: false
      });
    },
    
    // Notificação de mensagem
    message: (title, message = '', data = {}) => {
      addNotification({
        type: 'message',
        title,
        message,
        data,
        read: false
      });
    },
    
    // Notificação de campanha
    campaign: (title, message = '', data = {}) => {
      addNotification({
        type: 'campaign',
        title,
        message,
        data,
        read: false
      });
    },
    
    // Notificação de sistema
    system: (title, message = '', data = {}) => {
      addNotification({
        type: 'system',
        title,
        message,
        data,
        read: false
      });
    }
  };
};

/**
 * Hook para criar e enviar notificações na aplicação
 */
export const useNotificationSender = () => {
  const { addNotification } = useNotifications();
  
  // Criar os diferentes tipos de notificação
  const notificationTypes = createNotificationTypes(addNotification);
  
  return notificationTypes;
};

export default { useNotificationDisplay, useNotificationSender, createNotificationTypes }; 