import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  WhatsApp as WhatsAppIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatPhone } from '../utils/format';
import apiService from '../services/api';

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalContacts, setTotalContacts] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog de confirmação 
  const [openDialog, setOpenDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  
  // Dialog para criar/editar contato
  const [openContactForm, setOpenContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    tags: '',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Snackbar para notificações
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Buscar contatos da API
  const fetchContacts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Buscando contatos com parâmetros:', {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm
      });
      
      // Chamar a API de contatos com os parâmetros corretos
      const response = await apiService.contacts.getAll({
        page: page + 1, // API usa page baseada em 1, não 0
        limit: rowsPerPage,
        search: searchTerm,
      });
      
      console.log('Resposta completa da API:', response);
      
      // Verificar se a resposta existe
      if (!response || !response.data) {
        throw new Error('Resposta da API inválida');
      }
      
      const responseData = response.data;
      
      // Extrair dados da resposta, considerando diferentes formatos possíveis
      let contactsList = [];
      let totalCount = 0;
      
      // Formato principal esperado: { success: true, contacts: [...], total: X }
      if (responseData.contacts && Array.isArray(responseData.contacts)) {
        contactsList = responseData.contacts;
        totalCount = responseData.total || 0;
      } 
      // Formato alternativo: { success: true, data: { contacts: [...], total: X } }
      else if (responseData.data && responseData.data.contacts && Array.isArray(responseData.data.contacts)) {
        contactsList = responseData.data.contacts;
        totalCount = responseData.data.total || responseData.total || 0;
      }
      // Formato simples: [...] (array direto)
      else if (Array.isArray(responseData)) {
        contactsList = responseData;
        totalCount = responseData.length;
      }
      // Se não encontrou em formatos comuns, procurar em outros lugares
      else {
        // Tentar encontrar onde estão os contatos e o total na resposta
        console.warn('Formato de resposta não reconhecido:', responseData);
        
        // Última tentativa - procurar qualquer array na resposta
        const possibleArrays = Object.values(responseData).filter(v => Array.isArray(v));
        if (possibleArrays.length > 0) {
          contactsList = possibleArrays[0];
          totalCount = contactsList.length;
        } else {
          throw new Error('Não foi possível encontrar contatos na resposta da API');
        }
      }
      
      // Normalizar dados dos contatos para garantir consistência
      const normalizedContacts = contactsList.map(contact => ({
        id: contact._id || contact.id,
        name: contact.name || '',
        phoneNumber: contact.phoneNumber || contact.phone || '',
        email: contact.email || '',
        tags: Array.isArray(contact.tags) ? contact.tags : [],
        active: contact.active !== false, // true por padrão se não definido
        createdAt: contact.createdAt || null
      }));
      
      // Atualizar o estado
      setContacts(normalizedContacts);
      setTotalContacts(totalCount);
      
      // Mensagem se não houver contatos
      if (normalizedContacts.length === 0) {
        if (searchTerm) {
          setError('Nenhum contato encontrado para esta busca.');
        } else if (page > 0 && totalCount > 0) {
          // Se estiver em uma página sem resultados mas existem contatos
          setPage(0); // Voltar para a primeira página
        } else {
          setError('Nenhum contato encontrado. Adicione um novo contato para começar.');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
      setError(`Falha ao carregar os contatos: ${err.message || 'Erro desconhecido'}`);
      setContacts([]);
      setTotalContacts(0);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Carregar contatos ao inicializar ou quando os parâmetros mudarem
  useEffect(() => {
    fetchContacts();
  }, [page, rowsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Função de busca
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Executar busca quando o usuário pressionar Enter ou após um delay
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (page === 0) {
        fetchContacts();
      } else {
        setPage(0); // Isso vai acionar o useEffect acima
      }
    }, 500);
    
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Abrir dialog de confirmação para excluir contato
  const confirmDelete = (contact) => {
    setContactToDelete(contact);
    setOpenDialog(true);
  };
  
  // Fechar dialog de confirmação
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setContactToDelete(null);
  };
  
  // Excluir contato após confirmação
  const handleDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      await apiService.contacts.delete(contactToDelete.id || contactToDelete._id);
      
      // Atualizar a lista de contatos
      setContacts(contacts.filter(c => 
        (c.id || c._id) !== (contactToDelete.id || contactToDelete._id)
      ));
      
      // Mostrar notificação de sucesso
      setSnackbar({
        open: true,
        message: 'Contato excluído com sucesso',
        severity: 'success',
      });
    } catch (err) {
      console.error('Erro ao excluir contato:', err);
      
      // Mostrar notificação de erro
      setSnackbar({
        open: true,
        message: 'Erro ao excluir contato. Tente novamente.',
        severity: 'error',
      });
    } finally {
      handleCloseDialog();
    }
  };
  
  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Abrir formulário para criar novo contato
  const handleOpenContactForm = () => {
    setContactForm({
      name: '',
      phone: '',
      email: '',
      tags: '',
      status: 'active'
    });
    setFormErrors({});
    setOpenContactForm(true);
  };
  
  // Abrir formulário para editar um contato existente
  const handleEditContact = (contact) => {
    // Preparar o formulário com os dados do contato
    setContactForm({
      _id: contact.id || contact._id,
      name: contact.name || '',
      phone: contact.phoneNumber || contact.phone || '',
      email: contact.email || '',
      tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
      status: contact.active === false ? 'inactive' : 'active'
    });
    setFormErrors({});
    setOpenContactForm(true);
  };
  
  // Fechar formulário de contato
  const handleCloseContactForm = () => {
    setOpenContactForm(false);
  };
  
  // Atualizar valores do formulário
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setContactForm({
      ...contactForm,
      [name]: value
    });
    
    // Limpar erro do campo quando usuário digita
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };
  
  // Validar formulário
  const validateForm = () => {
    const errors = {};
    
    if (!contactForm.name?.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!contactForm.phone?.trim()) {
      errors.phone = 'Telefone é obrigatório';
    } else {
      // Remover todos os caracteres não numéricos
      const cleanedPhone = contactForm.phone.replace(/\D/g, '');
      
      // Verificar o tamanho (considerando com código de país 55 ou sem)
      if (cleanedPhone.length < 10 || cleanedPhone.length > 13) {
        errors.phone = 'Telefone inválido. Deve ter entre 10 e 13 dígitos';
      }
    }
    
    if (contactForm.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      errors.email = 'Email inválido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Verificar se um telefone já existe
  const checkPhoneExists = async (phone) => {
    try {
      // Limpar o telefone antes de verificar
      const cleanedPhone = phone.replace(/\D/g, '');
      
      // Buscar contatos com esse telefone
      const response = await apiService.contacts.getAll({
        search: cleanedPhone,
        limit: 1
      });
      
      // Verificar se a resposta existe
      if (!response || !response.data) {
        return false; // Tratar como se o telefone não existisse em caso de erro
      }
      
      const responseData = response.data;
      
      // Extrair contatos da resposta, considerando diferentes formatos possíveis
      let foundContacts = [];
      
      // Formato principal esperado: { success: true, contacts: [...] }
      if (responseData.contacts && Array.isArray(responseData.contacts)) {
        foundContacts = responseData.contacts;
      } 
      // Formato alternativo: { success: true, data: { contacts: [...] } }
      else if (responseData.data && responseData.data.contacts && Array.isArray(responseData.data.contacts)) {
        foundContacts = responseData.data.contacts;
      }
      // Formato simples: [...] (array direto)
      else if (Array.isArray(responseData)) {
        foundContacts = responseData;
      }
      // Se não encontrou em formatos comuns, procurar em outros lugares
      else {
        // Última tentativa - procurar qualquer array na resposta
        const possibleArrays = Object.values(responseData).filter(v => Array.isArray(v));
        if (possibleArrays.length > 0) {
          foundContacts = possibleArrays[0];
        }
      }
      
      // Se encontrou algum contato com esse telefone
      if (foundContacts.length > 0) {
        // Verificar se não é o próprio contato sendo editado
        if (contactForm._id) {
          const foundId = foundContacts[0]._id || foundContacts[0].id;
          if (foundId !== contactForm._id) {
            return true; // Telefone existe em outro contato
          }
        } else {
          return true; // Telefone existe e estamos criando um novo
        }
      }
      
      return false; // Telefone não existe
    } catch (error) {
      console.error('Erro ao verificar telefone:', error);
      return false; // Em caso de erro, permitir continuar
    }
  };
  
  // Enviar formulário
  const handleSubmitForm = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Limpar e formatar o número de telefone
      const cleanedPhone = contactForm.phone.trim().replace(/\D/g, '');
      
      // Verificar se o telefone está no formato correto
      if (cleanedPhone.length < 10 || cleanedPhone.length > 13) {
        throw new Error('Número de telefone inválido');
      }
      
      // Verificar se o telefone já existe
      const phoneExists = await checkPhoneExists(cleanedPhone);
      if (phoneExists) {
        throw new Error('Este número de telefone já está cadastrado para outro contato');
      }
      
      // Dados no formato que o backend espera
      const contactData = {
        name: contactForm.name.trim(),
        // Enviar tanto phoneNumber quanto phone para garantir compatibilidade
        phoneNumber: cleanedPhone,
        phone: cleanedPhone,
        email: contactForm.email.trim() || null,
        active: contactForm.status === 'active',
        tags: contactForm.tags 
          ? contactForm.tags.split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
          : []
      };
      
      let response;
      
      if (contactForm._id) {
        // Estamos editando um contato existente
        console.log('Enviando dados para atualizar contato:', contactData);
        response = await apiService.contacts.update(contactForm._id, contactData);
        console.log('Resposta da atualização de contato:', response);
      } else {
        // Estamos criando um novo contato
        console.log('Enviando dados para criar contato:', contactData);
        response = await apiService.contacts.create(contactData);
        console.log('Resposta da criação de contato:', response);
      }
      
      // Recarregar a lista de contatos
      await fetchContacts();
      
      // Mostrar mensagem de sucesso
      setSnackbar({
        open: true,
        message: contactForm._id 
          ? 'Contato atualizado com sucesso' 
          : 'Contato criado com sucesso',
        severity: 'success'
      });
      
      // Fechar formulário
      handleCloseContactForm();
    } catch (err) {
      console.error('Erro ao salvar contato:', err);
      
      // Mensagem de erro mais detalhada
      let errorMessage = 'Erro desconhecido';
      
      if (err.response) {
        // Erro da API com resposta
        const statusCode = err.response.status;
        
        if (statusCode === 409 || 
           (err.response.data && 
            (err.response.data.message?.includes('duplicate') || 
             JSON.stringify(err.response.data).includes('duplicate')))) {
          // Erro de duplicação
          errorMessage = 'Este número de telefone já está cadastrado';
        } else if (statusCode === 400) {
          // Erro de validação
          errorMessage = `Dados inválidos: ${err.response.data?.message || JSON.stringify(err.response.data)}`;
        } else if (statusCode === 401 || statusCode === 403) {
          // Erro de autenticação/autorização
          errorMessage = 'Você não tem permissão para realizar esta operação';
        } else {
          // Outro erro da API
          errorMessage = `Erro ${statusCode}: ${err.response.data?.message || JSON.stringify(err.response.data)}`;
        }
        
        console.error('Detalhes do erro:', err.response.data);
      } else if (err.message && err.message.includes('duplicate')) {
        // Erro de duplicação captado diretamente da mensagem
        errorMessage = 'Este número de telefone já está cadastrado';
      } else if (err.message) {
        // Outro erro com mensagem
        errorMessage = err.message;
      }
      
      setSnackbar({
        open: true,
        message: `Erro ao ${contactForm._id ? 'atualizar' : 'criar'} contato: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Contatos</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenContactForm}
        >
          Novo Contato
        </Button>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <TextField
            placeholder="Buscar contatos..."
            variant="outlined"
            size="small"
            sx={{ width: '100%', maxWidth: 500 }}
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Box>
            <Tooltip title="Recarregar contatos">
              <IconButton onClick={() => fetchContacts()} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filtros avançados">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="tabela de contatos">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'Nenhum contato encontrado para esta busca' : 'Nenhum contato cadastrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => {
                  return (
                    <TableRow key={contact.id} hover>
                      <TableCell component="th" scope="row">
                        {contact.name}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <WhatsAppIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                          {formatPhone(contact.phoneNumber)}
                        </Box>
                      </TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>
                        {(contact.tags || []).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={contact.active === false ? 'Inativo' : 'Ativo'}
                          color={contact.active === false ? 'default' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton onClick={() => handleEditContact(contact)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton onClick={() => confirmDelete(contact)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalContacts}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => {
            // Ajustar os valores 'from' e 'to' para considerar a página atual
            const adjustedFrom = count === 0 ? 0 : (page * rowsPerPage) + 1;
            const adjustedTo = Math.min((page + 1) * rowsPerPage, count);
            return `${adjustedFrom}-${adjustedTo} de ${count !== -1 ? count : `mais de ${adjustedTo}`}`;
          }}
        />
      </Paper>
      
      {/* Dialog para criar novo contato */}
      <Dialog 
        open={openContactForm} 
        onClose={handleCloseContactForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {contactForm._id ? 'Editar Contato' : 'Novo Contato'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Nome"
                value={contactForm.name}
                onChange={handleFormChange}
                fullWidth
                required
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="phone"
                label="Telefone"
                value={contactForm.phone}
                onChange={handleFormChange}
                fullWidth
                required
                placeholder="Ex: 5511912345678"
                error={!!formErrors.phone}
                helperText={formErrors.phone || "Formato: país (55) + DDD + número. Ex: 5511912345678"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={contactForm.email}
                onChange={handleFormChange}
                fullWidth
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="tags"
                label="Tags"
                value={contactForm.tags}
                onChange={handleFormChange}
                fullWidth
                helperText="Separe as tags por vírgula. Ex: cliente, premium, promoção"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={contactForm.status}
                  onChange={handleFormChange}
                  label="Status"
                >
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="inactive">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseContactForm}>Cancelar</Button>
          <Button 
            onClick={handleSubmitForm} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de confirmação para excluir contato */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o contato "{contactToDelete?.name}"?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default Contacts; 