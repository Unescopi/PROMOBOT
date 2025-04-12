import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Divider,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Snackbar,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Key as KeyIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  QrCode as QrCodeIcon,
  Delete as DeleteIcon,
  VolumeUp as VolumeUpIcon,
} from '@mui/icons-material';
import apiService from '../services/api';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`setting-tabpanel-${index}`}
      aria-labelledby={`setting-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState({
    api: {
      apiKey: '',
      baseUrl: 'https://api.evolution-api.com',
      instanceName: 'promobot',
      webhookUrl: '',
    },
    messages: {
      defaultDelay: 3,
      maxMessagesPerMinute: 20,
      enableReadReceipts: true,
      enableTypingIndicator: true,
    },
    notifications: {
      enableSoundEffects: true,
      soundEffects: {
        success: '/sounds/success.mp3',
        error: '/sounds/error.mp3',
        warning: '/sounds/warning.mp3',
        info: '/sounds/info.mp3',
        message: '/sounds/message.mp3'
      },
      showInDashboard: true,
      keepDays: 7,
      maxNotifications: 50,
      notifyOn: {
        campaignStart: true,
        campaignEnd: true,
        messageError: true,
        newMessage: true,
        systemError: true
      }
    },
    system: {
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      theme: 'light',
    },
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Mensagem de teste enviada por PROMOBOT');
  const [testMediaUrl, setTestMediaUrl] = useState('');
  const [testType, setTestType] = useState('text');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Carregar configurações ao montar o componente
  useEffect(() => {
    loadSettings();
    loadNotificationHistory();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [generalSettings, notificationSettings] = await Promise.all([
        apiService.settings.getAll(),
        apiService.notifications.getSettings()
      ]);
      
      setSettings({
        ...generalSettings,
        notifications: notificationSettings
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar configurações',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleApiChange = (event) => {
    setSettings(prev => ({
      ...prev,
      api: {
        ...prev.api,
        [event.target.name]: event.target.value,
      }
    }));
  };

  const handleMessageChange = (event) => {
    const { name, value, checked } = event.target;
    setSettings(prev => ({
      ...prev,
      messages: {
        ...prev.messages,
        [name]: event.target.type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleNotificationChange = (event) => {
    const { name, value, checked } = event.target;
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: event.target.type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSystemChange = (event) => {
    const { name, value } = event.target;
    setSettings(prev => ({
      ...prev,
      system: {
        ...prev.system,
        [name]: value
      }
    }));
  };

  const handleSaveSettings = async (section) => {
    try {
      setIsLoading(true);
      
      if (section === 'notifications') {
        await apiService.notifications.updateSettings(settings.notifications);
      } else {
        await apiService.settings.update(section, settings[section]);
      }
      
      setSnackbar({
        open: true,
        message: 'Configurações salvas com sucesso',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao salvar configurações',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = () => {
    // Simulação de teste de conexão
    setConnectionStatus('connecting');
    setTimeout(() => {
      setConnectionStatus('connected');
      setSnackbar({
        open: true,
        message: 'Conexão estabelecida com sucesso!',
        severity: 'success',
      });
    }, 2000);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const response = await apiService.evolutionApi.getStatus();
      setConnectionStatus(response);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setConnectionStatus({
        success: false,
        error: error.message || 'Erro ao verificar status'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRunTest = async () => {
    if (!testPhone) {
      setSnackbar({
        open: true,
        message: 'Digite um número de telefone para teste',
        severity: 'warning'
      });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      let result;
      
      if (testType === 'all') {
        // Diagnóstico completo
        result = await apiService.evolutionApi.runDiagnostic(testPhone);
        
        setTestResult({
          success: result.textMessageTest?.success || false,
          message: `Diagnóstico completo: ${result.textMessageTest?.success ? 'Texto OK' : 'Falha no texto'}, ${result.imageMessageTest?.success ? 'Imagem OK' : 'Falha na imagem'}`
        });
      } else if (testType === 'text') {
        // Teste de texto
        result = await apiService.evolutionApi.testText(testPhone, testMessage);
        
        setTestResult({
          success: true,
          message: `Mensagem de texto enviada com sucesso para ${testPhone}`
        });
      } else {
        // Teste de mídia
        result = await apiService.evolutionApi.testMedia(
          testPhone,
          testType,
          testMediaUrl,
          'Teste de mídia do PROMOBOT'
        );
        
        setTestResult({
          success: true,
          message: `${testType === 'image' ? 'Imagem' : 'Documento'} enviado com sucesso para ${testPhone}`
        });
      }
      
      // Salvar o número para uso futuro
      localStorage.setItem('testPhoneNumber', testPhone);
      
    } catch (error) {
      console.error('Erro no teste:', error);
      setTestResult({
        success: false,
        message: `Falha no teste: ${error.message || 'Erro desconhecido'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleGetQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const response = await apiService.evolutionApi.getQrCode();
      setQrCode(response);
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      setSnackbar({
        open: true,
        message: `Erro ao obter QR Code: ${error.message || 'Erro desconhecido'}`,
        severity: 'error'
      });
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.settings.clearCache();
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Cache limpo com sucesso!',
          severity: 'success',
        });
      } else {
        throw new Error(response.error || 'Erro ao limpar cache');
      }
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Erro ao limpar cache',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartWhatsApp = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.evolutionApi.disconnect();
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Conexão WhatsApp reiniciada com sucesso!',
          severity: 'success',
        });
        // Atualizar o status da conexão
        handleCheckStatus();
      } else {
        throw new Error(response.error || 'Erro ao reiniciar conexão WhatsApp');
      }
    } catch (error) {
      console.error('Erro ao reiniciar conexão WhatsApp:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Erro ao reiniciar conexão WhatsApp',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupSettings = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.settings.backup();
      
      if (response.success) {
        // Criar um link para download do arquivo
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `promobot-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSnackbar({
          open: true,
          message: 'Backup realizado com sucesso!',
          severity: 'success',
        });
      } else {
        throw new Error(response.error || 'Erro ao fazer backup');
      }
    } catch (error) {
      console.error('Erro ao fazer backup:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Erro ao fazer backup',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await apiService.notifications.getHistory();
      setNotificationHistory(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico de notificações:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar histórico de notificações',
        severity: 'error'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await apiService.notifications.clearHistory();
      setNotificationHistory([]);
      setSnackbar({
        open: true,
        message: 'Histórico de notificações limpo com sucesso',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao limpar histórico de notificações:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao limpar histórico de notificações',
        severity: 'error'
      });
    }
  };

  const handleNotificationOptionChange = (option, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        notifyOn: {
          ...prev.notifications.notifyOn,
          [option]: value
        }
      }
    }));
  };

  const handleSoundEffectChange = (effect, value) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        soundEffects: {
          ...prev.notifications.soundEffects,
          [effect]: value
        }
      }
    }));
  };

  const handleTestNotificationSound = async () => {
    try {
      await apiService.notifications.testSound(settings.notifications.soundEffects.success);
      setSnackbar({
        open: true,
        message: 'Som de sucesso testado com sucesso',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao testar som de sucesso:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao testar som de sucesso',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>
        Configurações
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<KeyIcon />} label="API" />
          <Tab icon={<MessageIcon />} label="Mensagens" />
          <Tab icon={<NotificationsIcon />} label="Notificações" />
          <Tab icon={<SettingsIcon />} label="Sistema" />
        </Tabs>

        {/* API Settings */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Configurações da API Evolution" />
                <Divider />
                <CardContent>
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Chave da API"
                      name="apiKey"
                      value={settings.api.apiKey}
                      onChange={handleApiChange}
                      margin="normal"
                      type="password"
                    />
                    <TextField
                      fullWidth
                      label="URL Base da API"
                      name="baseUrl"
                      value={settings.api.baseUrl}
                      onChange={handleApiChange}
                      margin="normal"
                      helperText="URL base da API Evolution"
                    />
                    <TextField
                      fullWidth
                      label="Nome da Instância"
                      name="instanceName"
                      value={settings.api.instanceName}
                      onChange={handleApiChange}
                      margin="normal"
                      helperText="Nome da instância no Evolution API"
                    />
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveSettings('api')}
                    sx={{ mr: 1 }}
                  >
                    Salvar
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleTestConnection}
                    disabled={connectionStatus === 'connecting'}
                  >
                    {connectionStatus === 'connecting' ? 'Conectando...' : 'Testar Conexão'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Status da Conexão" />
                <Divider />
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor:
                          connectionStatus === 'connected'
                            ? 'success.main'
                            : connectionStatus === 'connecting'
                            ? 'warning.main'
                            : 'error.main',
                        mr: 1,
                      }}
                    />
                    <Typography>
                      {connectionStatus === 'connected'
                        ? 'Conectado'
                        : connectionStatus === 'connecting'
                        ? 'Conectando...'
                        : 'Desconectado'}
                    </Typography>
                  </Box>

                  {connectionStatus === 'connected' && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      WhatsApp conectado e pronto para enviar mensagens
                    </Alert>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" gutterBottom>
                    Webhook
                  </Typography>
                  <TextField
                    fullWidth
                    label="URL do Webhook"
                    name="webhookUrl"
                    value={settings.api.webhookUrl}
                    onChange={handleApiChange}
                    margin="normal"
                    helperText="URL para receber notificações da API"
                  />
                  <FormControlLabel
                    control={<Switch checked />}
                    label="Ativar webhook para status de mensagens"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Message Settings */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Configurações de Envio" />
                <Divider />
                <CardContent>
                  <TextField
                    fullWidth
                    label="Atraso Padrão Entre Mensagens (segundos)"
                    name="defaultDelay"
                    type="number"
                    value={settings.messages.defaultDelay}
                    onChange={handleMessageChange}
                    margin="normal"
                    InputProps={{ inputProps: { min: 1, max: 60 } }}
                    helperText="Tempo de espera entre mensagens (em segundos)"
                  />
                  <TextField
                    fullWidth
                    label="Máximo de Mensagens por Minuto"
                    name="maxMessagesPerMinute"
                    type="number"
                    value={settings.messages.maxMessagesPerMinute}
                    onChange={handleMessageChange}
                    margin="normal"
                    InputProps={{ inputProps: { min: 1, max: 100 } }}
                    helperText="Limite de mensagens por minuto para evitar bloqueio"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.messages.enableTypingIndicator}
                        onChange={handleMessageChange}
                        name="enableTypingIndicator"
                      />
                    }
                    label="Mostrar indicador de digitação antes de enviar"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.messages.enableReadReceipts}
                        onChange={handleMessageChange}
                        name="enableReadReceipts"
                      />
                    }
                    label="Habilitar confirmação de leitura"
                  />
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SaveIcon />}
                      onClick={() => handleSaveSettings('messages')}
                    >
                      Salvar Configurações
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Mensagens Padrão" />
                <Divider />
                <CardContent>
                  <TextField
                    fullWidth
                    label="Mensagem de Boas-vindas"
                    multiline
                    rows={3}
                    defaultValue="Olá, {nome}! Obrigado por entrar em contato com a nossa empresa."
                    margin="normal"
                    helperText="Use {nome} para personalizar com o nome do contato"
                  />
                  <TextField
                    fullWidth
                    label="Mensagem de Confirmação"
                    multiline
                    rows={3}
                    defaultValue="Sua solicitação foi registrada com sucesso! Em breve entraremos em contato."
                    margin="normal"
                  />
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Formato de Mensagens</InputLabel>
                    <Select value="text" label="Formato de Mensagens">
                      <MenuItem value="text">Texto Simples</MenuItem>
                      <MenuItem value="markdown">Markdown</MenuItem>
                      <MenuItem value="html">HTML</MenuItem>
                    </Select>
                    <FormHelperText>
                      Formato padrão para mensagens enviadas pelo sistema
                    </FormHelperText>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notification Settings */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configurações de Notificação
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications?.enabled || false}
                    onChange={(e) => handleSaveSettings('notifications')}
                    name="notificationsEnabled"
                  />
                }
                label="Ativar Notificações"
              />

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Notificar sobre:
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications?.notifyOn?.campaignStart || false}
                        onChange={(e) => handleNotificationOptionChange('campaignStart', e.target.checked)}
                        name="campaignStart"
                      />
                    }
                    label="Início de Campanha"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications?.notifyOn?.campaignEnd || false}
                        onChange={(e) => handleNotificationOptionChange('campaignEnd', e.target.checked)}
                        name="campaignEnd"
                      />
                    }
                    label="Fim de Campanha"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications?.notifyOn?.messageError || false}
                        onChange={(e) => handleNotificationOptionChange('messageError', e.target.checked)}
                        name="messageError"
                      />
                    }
                    label="Erro em Mensagem"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications?.notifyOn?.newMessage || false}
                        onChange={(e) => handleNotificationOptionChange('newMessage', e.target.checked)}
                        name="newMessage"
                      />
                    }
                    label="Nova Mensagem"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications?.notifyOn?.systemError || false}
                        onChange={(e) => handleNotificationOptionChange('systemError', e.target.checked)}
                        name="systemError"
                      />
                    }
                    label="Erro no Sistema"
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                Configurações de Som:
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Som de Sucesso</InputLabel>
                    <Select
                      value={settings.notifications?.soundEffects?.success || '/sounds/success.mp3'}
                      onChange={(e) => handleSoundEffectChange('success', e.target.value)}
                      label="Som de Sucesso"
                    >
                      <MenuItem value="/sounds/success.mp3">Padrão</MenuItem>
                      <MenuItem value="/sounds/success-2.mp3">Alternativo 1</MenuItem>
                      <MenuItem value="/sounds/success-3.mp3">Alternativo 2</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Som de Erro</InputLabel>
                    <Select
                      value={settings.notifications?.soundEffects?.error || '/sounds/error.mp3'}
                      onChange={(e) => handleSoundEffectChange('error', e.target.value)}
                      label="Som de Erro"
                    >
                      <MenuItem value="/sounds/error.mp3">Padrão</MenuItem>
                      <MenuItem value="/sounds/error-2.mp3">Alternativo 1</MenuItem>
                      <MenuItem value="/sounds/error-3.mp3">Alternativo 2</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  sx={{ mr: 2 }}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Salvar Configurações'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleTestNotificationSound}
                  startIcon={<VolumeUpIcon />}
                >
                  Testar Sons
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Histórico de Notificações
              </Typography>
              <Box>
                <FormControl sx={{ minWidth: 120, mr: 2 }}>
                  <InputLabel>Manter por</InputLabel>
                  <Select
                    value={settings.notifications?.keepDays || 7}
                    onChange={(e) => handleNotificationChange({
                      target: { name: 'keepDays', value: e.target.value }
                    })}
                    label="Manter por"
                  >
                    <MenuItem value={1}>1 dia</MenuItem>
                    <MenuItem value={7}>7 dias</MenuItem>
                    <MenuItem value={30}>30 dias</MenuItem>
                    <MenuItem value={90}>90 dias</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleClearHistory}
                  startIcon={<DeleteIcon />}
                  disabled={!notificationHistory.length}
                >
                  Limpar Histórico
                </Button>
              </Box>
            </Box>

            {loadingHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : notificationHistory.length === 0 ? (
              <Typography variant="body1" color="textSecondary" align="center" sx={{ p: 3 }}>
                Nenhuma notificação registrada
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Mensagem</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notificationHistory.map((notification, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(notification.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={notification.type}
                            color={
                              notification.type === 'error' ? 'error' :
                              notification.type === 'success' ? 'success' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{notification.message}</TableCell>
                        <TableCell>
                          <Chip
                            label={notification.status}
                            color={
                              notification.status === 'sent' ? 'success' :
                              notification.status === 'failed' ? 'error' :
                              'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </TabPanel>

        {/* System Settings */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Configurações Gerais" />
                <Divider />
                <CardContent>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Idioma</InputLabel>
                    <Select
                      name="language"
                      value={settings.system.language}
                      onChange={handleSystemChange}
                      label="Idioma"
                    >
                      <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
                      <MenuItem value="en-US">English (US)</MenuItem>
                      <MenuItem value="es">Español</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Fuso Horário</InputLabel>
                    <Select
                      name="timezone"
                      value={settings.system.timezone}
                      onChange={handleSystemChange}
                      label="Fuso Horário"
                    >
                      <MenuItem value="America/Sao_Paulo">
                        América/São Paulo (GMT-3)
                      </MenuItem>
                      <MenuItem value="America/New_York">
                        América/Nova York (GMT-5)
                      </MenuItem>
                      <MenuItem value="Europe/London">
                        Europa/Londres (GMT+0)
                      </MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Formato de Data</InputLabel>
                    <Select
                      name="dateFormat"
                      value={settings.system.dateFormat}
                      onChange={handleSystemChange}
                      label="Formato de Data"
                    >
                      <MenuItem value="DD/MM/YYYY">DD/MM/AAAA</MenuItem>
                      <MenuItem value="MM/DD/YYYY">MM/DD/AAAA</MenuItem>
                      <MenuItem value="YYYY-MM-DD">AAAA-MM-DD</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Formato de Hora</InputLabel>
                    <Select
                      name="timeFormat"
                      value={settings.system.timeFormat}
                      onChange={handleSystemChange}
                      label="Formato de Hora"
                    >
                      <MenuItem value="24h">24 horas</MenuItem>
                      <MenuItem value="12h">12 horas (AM/PM)</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardHeader title="Aparência" />
                <Divider />
                <CardContent>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Tema</InputLabel>
                    <Select
                      name="theme"
                      value={settings.system.theme}
                      onChange={handleSystemChange}
                      label="Tema"
                    >
                      <MenuItem value="light">Claro</MenuItem>
                      <MenuItem value="dark">Escuro</MenuItem>
                      <MenuItem value="system">Sistema</MenuItem>
                    </Select>
                    <FormHelperText>
                      Selecione o tema da interface
                    </FormHelperText>
                  </FormControl>
                  
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SaveIcon />}
                      onClick={() => handleSaveSettings('system')}
                    >
                      Salvar Configurações
                    </Button>
                  </Box>
                </CardContent>
              </Card>
              
              <Card variant="outlined" sx={{ mt: 3 }}>
                <CardHeader title="Manutenção" />
                <Divider />
                <CardContent>
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    sx={{ mb: 1 }}
                    onClick={handleClearCache}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : null}
                  >
                    {isLoading ? 'Limpando Cache...' : 'Limpar Cache'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    fullWidth
                    sx={{ mb: 1 }}
                    onClick={handleRestartWhatsApp}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : null}
                  >
                    {isLoading ? 'Reiniciando...' : 'Reiniciar Conexão WhatsApp'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="info"
                    fullWidth
                    onClick={handleBackupSettings}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : null}
                  >
                    {isLoading ? 'Fazendo Backup...' : 'Fazer Backup de Configurações'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Seção de diagnóstico do WhatsApp */}
        <TabPanel value={tabValue} index={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Diagnóstico do WhatsApp
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Aqui você pode verificar o status da conexão com o WhatsApp e executar testes para garantir o funcionamento correto.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Status da conexão */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Status da conexão
              </Typography>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={handleCheckStatus}
                disabled={isChecking}
                startIcon={isChecking ? <CircularProgress size={20} /> : <RefreshIcon />}
                sx={{ mr: 2 }}
              >
                {isChecking ? 'Verificando...' : 'Verificar Status'}
              </Button>
              
              {connectionStatus && (
                <Alert 
                  severity={
                    connectionStatus.success ? 'success' : 'error'
                  }
                  sx={{ mt: 2 }}
                >
                  {connectionStatus.success 
                    ? `Conectado com o WhatsApp (Estado: ${connectionStatus.state || 'Desconhecido'})`
                    : `Desconectado do WhatsApp: ${connectionStatus.error || 'Erro desconhecido'}`
                  }
                </Alert>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Teste de envio */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Teste de mensagem
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Número para teste"
                    variant="outlined"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Ex: 5511999999999"
                    helperText="Digite o número completo com código do país"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de teste</InputLabel>
                    <Select
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      label="Tipo de teste"
                    >
                      <MenuItem value="text">Texto</MenuItem>
                      <MenuItem value="image">Imagem</MenuItem>
                      <MenuItem value="document">Documento</MenuItem>
                      <MenuItem value="all">Diagnóstico Completo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {testType === 'text' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Mensagem de teste"
                      variant="outlined"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      multiline
                      rows={2}
                      placeholder="Digite uma mensagem de teste"
                    />
                  </Grid>
                )}
                
                {(testType === 'image' || testType === 'document') && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={`URL ${testType === 'image' ? 'da imagem' : 'do documento'}`}
                      variant="outlined"
                      value={testMediaUrl}
                      onChange={(e) => setTestMediaUrl(e.target.value)}
                      placeholder={testType === 'image' 
                        ? "https://exemplo.com/imagem.jpg" 
                        : "https://exemplo.com/documento.pdf"}
                      helperText={`URL para ${testType === 'image' ? 'imagem' : 'documento'} de teste`}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleRunTest}
                    disabled={isTesting || !testPhone || (testType === 'text' && !testMessage) || ((testType === 'image' || testType === 'document') && !testMediaUrl)}
                    startIcon={isTesting ? <CircularProgress size={20} /> : <SendIcon />}
                  >
                    {isTesting ? 'Executando teste...' : 'Executar Teste'}
                  </Button>
                  
                  {testType === 'all' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      O diagnóstico completo testará texto e imagem com URLs padrão.
                    </Typography>
                  )}
                </Grid>
              </Grid>
              
              {testResult && (
                <Alert 
                  severity={testResult.success ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                >
                  {testResult.message}
                </Alert>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* QR Code */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                QR Code para conexão
              </Typography>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={handleGetQrCode}
                disabled={isLoadingQr}
                startIcon={isLoadingQr ? <CircularProgress size={20} /> : <QrCodeIcon />}
              >
                {isLoadingQr ? 'Carregando...' : 'Exibir QR Code'}
              </Button>
              
              {qrCode && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  {qrCode.qrcode ? (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        Escaneie o código com seu WhatsApp
                      </Typography>
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          maxWidth: '300px',
                          margin: '0 auto',
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1
                        }}
                        dangerouslySetInnerHTML={{ __html: qrCode.qrcode }}
                      />
                    </>
                  ) : (
                    <Alert severity="error">
                      Não foi possível gerar o QR Code. Verifique a conexão com o servidor.
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </TabPanel>
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Settings; 