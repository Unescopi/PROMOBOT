import React from 'react';
import { 
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Tooltip,
  Box
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

// Função para formatar a data
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Mapeamento de status para cores e labels
const statusMap = {
  draft: { color: 'default', label: 'Rascunho' },
  scheduled: { color: 'info', label: 'Agendada' },
  processing: { color: 'warning', label: 'Processando' },
  sending: { color: 'warning', label: 'Enviando' },
  completed: { color: 'success', label: 'Concluída' },
  paused: { color: 'warning', label: 'Pausada' },
  canceled: { color: 'error', label: 'Cancelada' },
  failed: { color: 'error', label: 'Falha' }
};

const CampaignRow = ({ campaign, onDelete, onStart, onStop, onEdit }) => {
  const { _id, name, status, isRecurring, scheduledDate, recurringType, statistics, createdAt } = campaign;
  
  // Determinar o tipo de campanha
  const getTypeLabel = () => {
    if (isRecurring) {
      const types = {
        daily: 'Diária',
        weekly: 'Semanal',
        monthly: 'Mensal'
      };
      return `Recorrente (${types[recurringType] || recurringType})`;
    } else if (scheduledDate) {
      return 'Agendada';
    } else {
      return 'Imediata';
    }
  };
  
  // Determinar a data relevante para exibição
  const getRelevantDate = () => {
    if (scheduledDate) {
      return formatDate(scheduledDate);
    } else if (isRecurring && campaign.recurringStartDate) {
      return `Início: ${formatDate(campaign.recurringStartDate)}`;
    } else {
      return formatDate(createdAt);
    }
  };
  
  // Formatar as estatísticas
  const formatStats = () => {
    const stats = statistics || {};
    const total = stats.total || 0;
    const sent = stats.sent || 0;
    const delivered = stats.delivered || 0;
    const failed = stats.failed || 0;
    
    if (total === 0) return 'Sem dados';
    
    if (status === 'draft' || status === 'scheduled') {
      return `${total} mensagens`;
    }
    
    return `${sent}/${total} enviadas, ${failed} falhas`;
  };
  
  // Determinar quais ações mostrar baseado no status
  const canStart = ['draft', 'paused', 'scheduled'].includes(status);
  const canStop = ['processing', 'sending'].includes(status);
  
  return (
    <TableRow hover>
      <TableCell>{name}</TableCell>
      <TableCell>
        <Chip 
          label={statusMap[status]?.label || status} 
          color={statusMap[status]?.color || 'default'}
          size="small"
        />
      </TableCell>
      <TableCell>{getTypeLabel()}</TableCell>
      <TableCell>{formatStats()}</TableCell>
      <TableCell>{getRelevantDate()}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex' }}>
          {status === 'draft' && (
            <Tooltip title="Editar">
              <IconButton size="small" onClick={onEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {status !== 'completed' && status !== 'canceled' && status !== 'failed' && (
            <Tooltip title="Excluir">
              <IconButton size="small" onClick={() => onDelete(campaign)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {canStart && (
            <Tooltip title="Iniciar">
              <IconButton size="small" onClick={() => onStart(campaign)}>
                <StartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {canStop && (
            <Tooltip title="Parar">
              <IconButton size="small" onClick={() => onStop(campaign)}>
                <StopIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Visualizar">
            <IconButton size="small" onClick={onEdit}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
};

export default CampaignRow; 