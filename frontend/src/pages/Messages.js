import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Image as ImageIcon,
  Videocam as VideocamIcon,
  AudioFile as AudioIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import apiService from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

function Messages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteMessageId, setDeleteMessageId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await apiService.messages.getAll();
      
      // Verificar formato da resposta e extrair mensagens
      let messageList = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          messageList = response.data;
        } else if (response.data.messages && Array.isArray(response.data.messages)) {
          messageList = response.data.messages;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          messageList = response.data.data;
        }
      }
      
      setMessages(messageList);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
      setError('Falha ao carregar a lista de mensagens. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearch(event.target.value);
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  const handleCreateMessage = () => {
    navigate('/messages/new');
  };

  const handleEditMessage = (id) => {
    navigate(`/messages/edit/${id}`);
  };

  const handleDeleteClick = (id) => {
    setDeleteMessageId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteMessageId) return;
    
    try {
      setLoading(true);
      await apiService.messages.delete(deleteMessageId);
      setMessages(messages.filter(message => message._id !== deleteMessageId));
      toast.success('Mensagem excluída com sucesso');
    } catch (err) {
      console.error('Erro ao excluir mensagem:', err);
      toast.error('Erro ao excluir mensagem');
    } finally {
      setLoading(false);
      setOpenDeleteDialog(false);
      setDeleteMessageId(null);
    }
  };

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false);
    setDeleteMessageId(null);
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'Data desconhecida';
    
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return 'Data inválida';
    }
  };

  // Filtrar mensagens com base na pesquisa
  const filteredMessages = messages.filter(message =>
    message.title?.toLowerCase().includes(search.toLowerCase()) ||
    message.content?.toLowerCase().includes(search.toLowerCase())
  );

  // Renderizar ícone com base no tipo de mídia
  const renderMediaTypeIcon = (mediaType) => {
    if (!mediaType) return null;

    switch (mediaType) {
      case 'image':
        return <ImageIcon color="primary" />;
      case 'video':
        return <VideocamIcon color="secondary" />;
      case 'audio':
        return <AudioIcon color="warning" />;
      case 'document':
        return <DocumentIcon color="info" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Mensagens</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateMessage}
        >
          Nova Mensagem
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Pesquisar mensagens..."
          value={search}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton onClick={handleClearSearch} edge="end">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredMessages.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Conteúdo</TableCell>
                <TableCell>Tipo de Mídia</TableCell>
                <TableCell>Criado em</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMessages.map((message) => (
                <TableRow key={message._id}>
                  <TableCell>{message.title}</TableCell>
                  <TableCell>
                    {message.content?.length > 100
                      ? `${message.content.substring(0, 100)}...`
                      : message.content}
                  </TableCell>
                  <TableCell>
                    {message.mediaType ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {renderMediaTypeIcon(message.mediaType)}
                        <Chip 
                          label={message.mediaType.charAt(0).toUpperCase() + message.mediaType.slice(1)} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    ) : (
                      'Texto'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(message.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton 
                        onClick={() => handleEditMessage(message._id)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton 
                        onClick={() => handleDeleteClick(message._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            {search ? 'Nenhuma mensagem encontrada para esta pesquisa.' : 'Nenhuma mensagem cadastrada.'}
          </Typography>
          {!search && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateMessage}
              sx={{ mt: 2 }}
            >
              Criar Primeira Mensagem
            </Button>
          )}
        </Paper>
      )}

      {/* Diálogo de confirmação de exclusão */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir esta mensagem? Esta ação não poderá ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Messages; 