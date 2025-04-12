import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  LinearProgress,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Container,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  FileCopy as FileCopyIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatDate } from '../utils/format';
import apiService from '../services/api';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import CampaignRow from '../components/CampaignRow';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`campaign-tabpanel-${index}`}
      aria-labelledby={`campaign-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function CampaignCard({ campaign, onRefresh, onAction }) {
  const navigate = useNavigate();
  
  const calculateProgress = (campaign) => {
    if (!campaign?.statistics?.total) return 0;
    
    const { total, sent } = campaign.statistics;
    if (total === 0) return 0;
    
    return Math.round((sent / total) * 100);
  };
  
  const progress = calculateProgress(campaign);
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'scheduled':
        return 'Agendada';
      case 'sending':
        return 'Enviando';
      case 'paused':
        return 'Pausada';
      case 'completed':
        return 'Concluída';
      case 'canceled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sending':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'completed':
        return 'default';
      case 'paused':
        return 'warning';
      case 'canceled':
        return 'error';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };
  
  const handleAction = (action) => {
    if (onAction) {
      onAction(campaign._id, action);
    }
  };
  
  const handleEdit = () => {
    navigate(`/campaigns/edit/${campaign._id}`);
  };
  
  const handleStats = () => {
    navigate(`/campaigns/stats/${campaign._id}`);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="div">
            {campaign.name}
          </Typography>
          <Chip 
            label={getStatusLabel(campaign.status)} 
            color={getStatusColor(campaign.status)}
            size="small"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {campaign.isRecurring 
            ? `Recorrente (${campaign.recurringType})`
            : (campaign.scheduledDate 
                ? `Agendada para: ${formatDate(campaign.scheduledDate)}` 
                : 'Sem data de agendamento')}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ flexGrow: 1, mr: 2 }} 
          />
          <Typography variant="body2">{progress}%</Typography>
        </Box>
        
        <Grid container spacing={1} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Typography variant="body2">Total: {campaign.statistics?.total || 0}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">Enviadas: {campaign.statistics?.sent || 0}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">Entregues: {campaign.statistics?.delivered || 0}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">Lidas: {campaign.statistics?.read || 0}</Typography>
          </Grid>
        </Grid>
      </CardContent>
      
      <Divider />
      
      <CardActions>
        {campaign.status === 'draft' && (
          <Tooltip title="Iniciar">
            <IconButton size="small" onClick={() => handleAction('start')}>
              <PlayArrowIcon />
            </IconButton>
          </Tooltip>
        )}
        {campaign.status === 'sending' && (
          <Tooltip title="Pausar">
            <IconButton size="small" onClick={() => handleAction('pause')}>
              <PauseIcon />
            </IconButton>
          </Tooltip>
        )}
        {campaign.status === 'paused' && (
          <Tooltip title="Retomar">
            <IconButton size="small" onClick={() => handleAction('resume')}>
              <PlayArrowIcon />
            </IconButton>
          </Tooltip>
        )}
        {campaign.status === 'scheduled' && (
          <Tooltip title="Cancelar">
            <IconButton size="small" onClick={() => handleAction('cancel')}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
        {['draft', 'scheduled', 'paused'].includes(campaign.status) && (
          <Tooltip title="Editar">
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Duplicar">
          <IconButton size="small" onClick={() => handleAction('duplicate')}>
            <FileCopyIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Estatísticas">
          <IconButton size="small" onClick={handleStats}>
            <AssessmentIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excluir">
          <IconButton size="small" onClick={() => handleAction('delete')}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para diálogos e notificações
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    campaignId: null,
    action: null,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const fetchCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.campaigns.getAll();
      
      console.log('Resposta da API de campanhas:', response);
      
      if (!response?.data) {
        throw new Error('Resposta da API inválida');
      }
      
      let campaignsList = [];
      
      // Lidar com diferentes formatos de resposta
      if (Array.isArray(response.data)) {
        campaignsList = response.data;
      } else if (response.data.campaigns && Array.isArray(response.data.campaigns)) {
        campaignsList = response.data.campaigns;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        campaignsList = response.data.data;
      }
      
      // Se ainda não encontramos as campanhas, procurar em outros lugares da resposta
      if (campaignsList.length === 0) {
        Object.values(response.data).forEach(value => {
          if (Array.isArray(value) && value.length > 0 && value[0]?.name) {
            campaignsList = value;
          }
        });
      }
      
      setCampaigns(campaignsList);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
      setError('Falha ao carregar as campanhas. Tente novamente.');
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCampaigns();
  }, []);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const confirmCampaignAction = (campaignId, action) => {
    let title = '';
    let message = '';
    
    switch (action) {
      case 'start':
        title = 'Iniciar Campanha';
        message = 'Tem certeza que deseja iniciar esta campanha? Ela começará a enviar mensagens imediatamente.';
        break;
      case 'pause':
        title = 'Pausar Campanha';
        message = 'Tem certeza que deseja pausar esta campanha? Você poderá retomá-la mais tarde.';
        break;
      case 'resume':
        title = 'Retomar Campanha';
        message = 'Tem certeza que deseja retomar esta campanha? Ela continuará enviando mensagens de onde parou.';
        break;
      case 'cancel':
        title = 'Cancelar Campanha';
        message = 'Tem certeza que deseja cancelar esta campanha? Esta ação não pode ser desfeita.';
        break;
      case 'delete':
        title = 'Excluir Campanha';
        message = 'Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.';
        break;
      case 'duplicate':
        title = 'Duplicar Campanha';
        message = 'Tem certeza que deseja duplicar esta campanha? Será criada uma cópia com todas as configurações.';
        break;
      default:
        return;
    }
    
    setConfirmDialog({
      open: true,
      title,
      message,
      campaignId,
      action,
    });
  };
  
  const handleCloseDialog = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false,
    });
  };
  
  const handleConfirmAction = async () => {
    const { campaignId, action } = confirmDialog;
    
    if (!campaignId || !action) {
      handleCloseDialog();
      return;
    }
    
    setIsLoading(true);
    
    try {
      let response;
      
      switch (action) {
        case 'start':
          response = await apiService.campaigns.start(campaignId);
          break;
        case 'pause':
          response = await apiService.campaigns.pause(campaignId);
          break;
        case 'resume':
          response = await apiService.campaigns.resume(campaignId);
          break;
        case 'delete':
          response = await apiService.campaigns.delete(campaignId);
          break;
        case 'duplicate':
          // Primeiro precisamos obter os dados da campanha
          const campaignData = await apiService.campaigns.getById(campaignId);
          if (campaignData?.data) {
            // Remover campos que não devem ser duplicados
            const { _id, createdAt, updatedAt, status, statistics, ...duplicateData } = campaignData.data;
            duplicateData.name = `Cópia de ${duplicateData.name}`;
            duplicateData.status = 'draft';
            
            // Criar nova campanha com os dados duplicados
            response = await apiService.campaigns.create(duplicateData);
          }
          break;
        default:
          throw new Error('Ação desconhecida');
      }
      
      console.log(`Resposta da ação ${action}:`, response);
      
      // Atualizar a lista de campanhas
      await fetchCampaigns();
      
      // Mostrar notificação de sucesso
      setSnackbar({
        open: true,
        message: `Ação realizada com sucesso!`,
        severity: 'success',
      });
    } catch (err) {
      console.error(`Erro ao realizar ação ${action}:`, err);
      setSnackbar({
        open: true,
        message: `Erro ao realizar ação: ${err.message || 'Erro desconhecido'}`,
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
      handleCloseDialog();
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const handleCreateCampaign = () => {
    navigate('/campaigns/new');
  };
  
  // Filtrar campanhas com base no filtro selecionado
  const getFilteredCampaigns = () => {
    switch (tabValue) {
      case 'all':
        return campaigns;
      case 'active':
        return campaigns.filter(campaign => 
          ['scheduled', 'sending', 'processing'].includes(campaign.status)
        );
      case 'draft':
        return campaigns.filter(campaign => campaign.status === 'draft');
      case 'completed':
        return campaigns.filter(campaign => 
          ['completed', 'canceled', 'failed'].includes(campaign.status)
        );
      default:
        return campaigns;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Campanhas</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/campaigns/new')}
        >
          Nova Campanha
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="filtros de campanhas">
            <Tab label="Todas" value="all" />
            <Tab label="Ativas" value="active" />
            <Tab label="Rascunhos" value="draft" />
            <Tab label="Concluídas" value="completed" />
          </Tabs>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : getFilteredCampaigns().length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              Nenhuma campanha encontrada.
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<AddIcon />} 
              sx={{ mt: 2 }}
              onClick={() => navigate('/campaigns/new')}
            >
              Criar Nova Campanha
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Mensagens</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredCampaigns().map((campaign) => (
                  <CampaignRow 
                    key={campaign._id} 
                    campaign={campaign} 
                    onDelete={confirmCampaignAction}
                    onStart={confirmCampaignAction}
                    onStop={confirmCampaignAction}
                    onEdit={() => navigate(`/campaigns/edit/${campaign._id}`)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        content={confirmDialog.message}
        onConfirm={handleConfirmAction}
        onCancel={handleCloseDialog}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert severity={snackbar.severity} onClose={handleCloseSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Campaigns; 