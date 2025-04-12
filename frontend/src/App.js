import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { SnackbarProvider } from 'notistack';

// Contextos
import { NotificationProvider } from './contexts/NotificationContext';

// Utilitários
import { useNotificationDisplay } from './utils/notificationUtils';

// Páginas
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import CampaignForm from './pages/CampaignForm';
import MessageForm from './pages/MessageForm';
import Messages from './pages/Messages';
import Segmentation from './pages/Segmentation';
import Settings from './pages/Settings';
import NotificationsPage from './pages/NotificationsPage';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Componentes
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Componente para verificar autenticação
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Layout principal com a sidebar e header
const DashboardLayout = ({ children }) => {
  const [open, setOpen] = useState(true);
  
  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Header open={open} toggleDrawer={toggleDrawer} />
      <Sidebar open={open} toggleDrawer={toggleDrawer} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          pt: 8,
          px: 3,
          pb: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

// Componente que exibe notificações
const NotificationDisplayWrapper = ({ children }) => {
  useNotificationDisplay();
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <NotificationProvider>
          <NotificationDisplayWrapper>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/contacts" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Contacts />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/campaigns" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Campaigns />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/campaigns/new" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <CampaignForm />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/campaigns/edit/:id" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <CampaignForm />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/campaigns/stats/:id" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Campaigns />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/messages" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Messages />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/messages/new" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <MessageForm />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/messages/edit/:id" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <MessageForm />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/segmentation" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Segmentation />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Settings />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <NotificationsPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                {/* Página 404 */}
                <Route path="/404" element={<NotFound />} />
                
                {/* Rota de fallback para redirecionar páginas não encontradas */}
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </Router>
          </NotificationDisplayWrapper>
        </NotificationProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
