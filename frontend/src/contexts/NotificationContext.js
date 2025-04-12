import React, { createContext, useState, useEffect, useContext } from 'react';
import apiService from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Função para buscar todas as notificações
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.notifications.getUnread();
      setNotifications(response.data || []);
      setUnreadCount(response.data?.length || 0);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      setError('Erro ao buscar notificações');
    } finally {
      setLoading(false);
    }
  };

  // Marca uma notificação como lida
  const markAsRead = async (id) => {
    try {
      await apiService.notifications.markAsRead(id);
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === id ? { ...notification, read: true } : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  // Marca todas as notificações como lidas
  const markAllAsRead = async () => {
    try {
      await apiService.notifications.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas notificações como lidas:', err);
    }
  };

  // Deleta uma notificação
  const deleteNotification = async (id) => {
    try {
      await apiService.notifications.markAsRead(id);
      setNotifications(prev => prev.filter(notification => notification._id !== id));
      // Recalcular contagem de não lidas
      setUnreadCount(prev => {
        const notification = notifications.find(n => n._id === id);
        return notification && !notification.read ? prev - 1 : prev;
      });
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
    }
  };

  // Limpa todas as notificações
  const clearAllNotifications = async () => {
    try {
      await apiService.notifications.clearHistory();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao limpar notificações:', err);
    }
  };

  // Adicionar uma nova notificação
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Buscar notificações ao montar o componente
  useEffect(() => {
    fetchNotifications();
    
    // Configurar um intervalo para buscar notificações periodicamente
    const interval = setInterval(fetchNotifications, 60000); // A cada minuto
    
    // Limpar intervalo ao desmontar
    return () => clearInterval(interval);
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 