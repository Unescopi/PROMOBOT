import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Divider,
  Chip,
  Alert,
  Snackbar,
  IconButton,
  Checkbox,
  FormGroup,
  FormLabel,
  Autocomplete,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import apiService from '../services/api';
import { formatDate } from '../utils/format';

// Constantes para mensagens de erro
const ERROR_MESSAGES = {
  DATE_FUTURE: 'A data de agendamento deve ser futura',
  DATE_INVALID: 'Formato de data inválido',
  RECURRING_START_FUTURE: 'A data de início da recorrência deve ser futura',
  RECURRING_START_INVALID: 'Formato de data de início inválido',
  RECURRING_END_INVALID: 'Formato de data de término inválido',
  RECURRING_END_AFTER_START: 'A data de término deve ser posterior à data de início',
  PROCESS_ERROR: 'Erro ao processar a data. Tente novamente.',
};

// Componente para exibir um painel de tab
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  // Estado para os campos do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    message: '',
    contacts: [],
    tags: [],
    scheduledDate: null,
    isRecurring: false,
    recurringType: '',
    recurringDays: [],
    recurringHour: 9,
    recurringMinute: 0,
    recurringStartDate: null,
    recurringEndDate: null,
    allowedTimeStart: 8,
    allowedTimeEnd: 20,
    allowedDaysOfWeek: [1, 2, 3, 4, 5], // Por padrão, dias úteis (seg a sex)
    sendToAll: false
  });
  
  // Estados para controles de UI
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null); // Estado para erros de validação
  const [internalError, setInternalError] = useState(null); // Para erros internos que não devem ser mostrados ao usuário
  const [tabValue, setTabValue] = useState(0);
  const [messages, setMessages] = useState([]);
  const [contactList, setContactList] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [contactsWithSelectedTags, setContactsWithSelectedTags] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Passos do stepper
  const steps = ['Informações Básicas', 'Mensagem', 'Destinatários', 'Agendamento'];
  
  // Manipulador global de erros para evitar que a aplicação trave
  const handleGlobalError = useCallback((errorMessage, error) => {
    console.error('Erro capturado:', errorMessage, error);
    setInternalError(errorMessage);
    
    // Exibir um snackbar com a mensagem de erro
    setSnackbar({
      open: true,
      message: `Ocorreu um erro: ${errorMessage}. Tente novamente.`,
      severity: 'error'
    });
    
    // Não deixar o processo de carregamento infinito
    setIsLoading(false);
    setIsSaving(false);
  }, []);

  // Função auxiliar para formatar datas com segurança
  const safeFormatDate = (date) => {
    try {
      if (!date) return '';
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toISOString().slice(0, 16);
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return '';
    }
  };
  
  // Carregar dados da campanha se for modo de edição
  useEffect(() => {
    // Carregar dados necessários para o formulário
    fetchMessages();
    
    // Sequência de carregamento: contatos -> campanha -> tags
    const loadData = async () => {
      try {
        // Primeiro carregar os contatos
        const contacts = await fetchContacts();
        
        // Depois carregar a campanha se for modo de edição
        if (isEditMode) {
          await fetchCampaign();
        }
        
        // Extrair tags dos contatos
        fetchTags();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        handleGlobalError('Erro ao carregar dados. Por favor, tente novamente.', error);
      }
    };
    
    loadData();
  }, [id, handleGlobalError]);
  
  // Efeito para garantir que os contatos sejam carregados quando necessário
  useEffect(() => {
    // Se estamos na aba de contatos e não temos contatos, carregá-los
    if (activeStep === 2 && tabValue === 0 && contactList.length === 0 && !isLoading) {
      console.log('Carregando contatos automaticamente...');
      fetchContacts();
    }
  }, [activeStep, tabValue]);
  
  // Buscar dados da campanha
  const fetchCampaign = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiService.campaigns.getById(id);
      
      if (!response?.data) {
        throw new Error('Não foi possível carregar os dados da campanha');
      }
      
      const campaign = response.data;
      console.log('Dados da campanha carregados:', campaign);
      
      // Normalizar dados da campanha para o formulário
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        message: campaign.message?._id || campaign.message || '',
        contacts: Array.isArray(campaign.contacts) 
          ? campaign.contacts.map(c => typeof c === 'string' ? c : c._id || c.id) 
          : [],
        tags: campaign.tags || [],
        scheduledDate: campaign.scheduledDate || null,
        isRecurring: campaign.isRecurring || false,
        recurringType: campaign.recurringType || null,
        recurringDays: campaign.recurringDays || [],
        recurringHour: campaign.recurringHour ?? 9,
        recurringMinute: campaign.recurringMinute ?? 0,
        recurringStartDate: campaign.recurringStartDate || null,
        recurringEndDate: campaign.recurringEndDate || null,
        allowedTimeStart: campaign.allowedTimeStart ?? 8,
        allowedTimeEnd: campaign.allowedTimeEnd ?? 20,
        allowedDaysOfWeek: campaign.allowedDaysOfWeek || [1, 2, 3, 4, 5],
        sendToAll: campaign.sendToAll || false
      });
      
      // Configurar seleções para UI
      if (campaign.contacts && Array.isArray(campaign.contacts)) {
        // Obter os IDs dos contatos da campanha
        const campaignContactIds = campaign.contacts.map(c => 
          typeof c === 'string' ? c : c._id || c.id
        );
        
        console.log('IDs de contatos da campanha:', campaignContactIds);
        console.log('Lista de contatos disponíveis:', contactList);
        
        // Encontrar os objetos de contato completos correspondentes a esses IDs
        const selectedContactObjects = contactList.filter(contact => {
          const contactId = contact._id || contact.id;
          const isSelected = campaignContactIds.includes(contactId);
          console.log(`Contato ${contactId} (${contact.name}) está selecionado: ${isSelected}`);
          return isSelected;
        });
        
        console.log('Objetos de contato selecionados:', selectedContactObjects);
        setSelectedContacts(selectedContactObjects);
      }
      
      if (campaign.tags && Array.isArray(campaign.tags)) {
        setSelectedTags(campaign.tags);
      }
      
    } catch (err) {
      console.error('Erro ao carregar campanha:', err);
      handleGlobalError('Erro ao carregar dados da campanha. Tente novamente.', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Buscar mensagens disponíveis
  const fetchMessages = async () => {
    try {
      const response = await apiService.messages.getAll();
      
      if (response?.data) {
        let messagesList = [];
        
        if (Array.isArray(response.data)) {
          messagesList = response.data;
        } else if (response.data.messages && Array.isArray(response.data.messages)) {
          messagesList = response.data.messages;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          messagesList = response.data.data;
        }
        
        setMessages(messagesList);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      handleGlobalError('Erro ao carregar mensagens.', err);
    }
  };
  
  // Buscar contatos disponíveis
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      console.log('Buscando contatos...');
      
      // Usar mínimo de parâmetros para evitar erros de validação
      const response = await apiService.contacts.getAll({
        limit: 100,
        page: 1
      });
      
      console.log('Resposta da API de contatos:', response?.data);
      
      if (!response || !response.data) {
        console.error('Resposta da API de contatos vazia');
        setContactList([]);
        setIsLoading(false);
        return [];
      }
      
      let contactsList = [];
      const responseData = response.data;
      
      // Extrair os contatos da resposta da API
      if (responseData.contacts && Array.isArray(responseData.contacts)) {
        console.log(`Encontrados ${responseData.contacts.length} contatos na resposta`);
        contactsList = responseData.contacts;
      } else if (responseData.success && responseData.contacts && Array.isArray(responseData.contacts)) {
        console.log(`Encontrados ${responseData.contacts.length} contatos na resposta`);
        contactsList = responseData.contacts;
      } else if (Array.isArray(responseData)) {
        console.log(`Encontrados ${responseData.length} contatos na resposta (formato array)`);
        contactsList = responseData;
      } else {
        console.error('Formato de resposta não reconhecido:', responseData);
        setContactList([]);
        setIsLoading(false);
        return [];
      }
      
      // Normalizar os dados dos contatos
      const normalizedContacts = contactsList.map(contact => {
        if (!contact) return null;
        
        const contactId = contact._id || contact.id;
        
        return {
          _id: contactId,
          id: contactId,
          name: contact.name || 'Sem nome',
          phoneNumber: contact.phoneNumber || contact.phone || '',
          email: contact.email || '',
          tags: Array.isArray(contact.tags) ? contact.tags : [],
          active: contact.active !== false
        };
      }).filter(Boolean);
      
      console.log(`${normalizedContacts.length} contatos processados com sucesso`);
      setContactList(normalizedContacts);
      return normalizedContacts;
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
      handleGlobalError('Erro ao carregar contatos.', err);
      setContactList([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  // Buscar tags disponíveis
  const fetchTags = async () => {
    try {
      // Aqui, poderíamos ter um endpoint específico para obter tags
      // Como não temos, podemos extrair tags únicas dos contatos
      const uniqueTags = new Set();
      
      contactList.forEach(contact => {
        if (contact.tags && Array.isArray(contact.tags)) {
          contact.tags.forEach(tag => uniqueTags.add(tag));
        }
      });
      
      setAvailableTags(Array.from(uniqueTags));
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
      handleGlobalError('Erro ao carregar tags.', err);
    }
  };
  
  // Atualizar as tags únicas quando a lista de contatos mudar
  useEffect(() => {
    try {
      fetchTags();
    } catch (err) {
      handleGlobalError('Erro ao atualizar tags', err);
    }
  }, [contactList, handleGlobalError]);
  
  // Manipulador de mudança de campo no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Manipulador para campos de checkbox
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Manipulador para lista de dias da semana permitidos
  const handleDayOfWeekChange = (e) => {
    const { value, checked } = e.target;
    const day = parseInt(value, 10);
    
    setFormData(prev => {
      const currentDays = [...prev.allowedDaysOfWeek];
      
      if (checked && !currentDays.includes(day)) {
        currentDays.push(day);
      } else if (!checked && currentDays.includes(day)) {
        const index = currentDays.indexOf(day);
        currentDays.splice(index, 1);
      }
      
      return { ...prev, allowedDaysOfWeek: currentDays };
    });
  };
  
  // Manipulador para lista de dias recorrentes
  const handleRecurringDayChange = (e) => {
    const { value, checked } = e.target;
    const day = parseInt(value, 10);
    
    setFormData(prev => {
      const currentDays = [...prev.recurringDays];
      
      if (checked && !currentDays.includes(day)) {
        currentDays.push(day);
      } else if (!checked && currentDays.includes(day)) {
        const index = currentDays.indexOf(day);
        currentDays.splice(index, 1);
      }
      
      return { ...prev, recurringDays: currentDays };
    });
  };
  
  // Manipulador para seleção de contatos
  const handleContactsChange = (event, newValue) => {
    const contactIds = newValue.map(contact => 
      typeof contact === 'string' ? contact : contact._id || contact.id
    );
    
    setSelectedContacts(newValue);
    setFormData(prev => ({ ...prev, contacts: contactIds }));
  };
  
  // Manipulador para seleção de tags
  const handleTagsChange = (event, newValue) => {
    setSelectedTags(newValue);
    setFormData(prev => ({ ...prev, tags: newValue }));
    
    // Calcular estimativa de contatos com essas tags
    if (newValue.length > 0) {
      const count = contactList.filter(contact => 
        contact.tags && contact.tags.some(tag => newValue.includes(tag))
      ).length;
      setContactsWithSelectedTags(count);
    } else {
      setContactsWithSelectedTags(0);
    }
  };
  
  // Manipulador para mudança de tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Recarregar os contatos ao mudar para a aba de contatos específicos
    if (newValue === 0 && contactList.length === 0) {
      fetchContacts();
    }
  };
  
  // Manipulador para mudança no stepper
  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };
  
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };
  
  // Validar o formulário antes de enviar
  const validateForm = () => {
    if (!formData.name) {
      setError('O nome da campanha é obrigatório');
      setActiveStep(0); // Voltar para a etapa de informações básicas
      return false;
    }
    
    if (!formData.message) {
      setError('Você deve selecionar uma mensagem');
      setActiveStep(1); // Voltar para a etapa de mensagem
      return false;
    }
    
    // Verificar se pelo menos uma forma de seleção de contatos foi escolhida
    if (!formData.sendToAll && formData.contacts.length === 0 && formData.tags.length === 0) {
      setError('Você deve selecionar contatos específicos, tags ou ativar "enviar para todos"');
      setActiveStep(2); // Voltar para a etapa de contatos
      return false;
    }
    
    // Para campanhas recorrentes, verificar configuração
    if (formData.isRecurring) {
      if (!formData.recurringType) {
        setError('Você deve selecionar um tipo de recorrência');
        setActiveStep(3);
        return false;
      }
      
      if (!formData.recurringStartDate) {
        setError('Você deve definir uma data de início para a recorrência');
        setActiveStep(3);
        return false;
      }
      
      // Verificar se a data de início da recorrência é válida e está no futuro
      const recurringStartDate = new Date(formData.recurringStartDate);
      const now = new Date();
      
      if (isNaN(recurringStartDate.getTime())) {
        setError('A data de início da recorrência é inválida');
        setActiveStep(3);
        return false;
      }
      
      if (recurringStartDate <= now) {
        setError('A data de início da recorrência deve ser futura');
        setActiveStep(3);
        return false;
      }
      
      if (formData.recurringType === 'weekly' && formData.recurringDays.length === 0) {
        setError('Você deve selecionar pelo menos um dia da semana para recorrência semanal');
        setActiveStep(3);
        return false;
      }
      
      if (formData.recurringType === 'monthly' && formData.recurringDays.length === 0) {
        setError('Você deve selecionar pelo menos um dia do mês para recorrência mensal');
        setActiveStep(3);
        return false;
      }
      
      // Verificar data final da recorrência, se definida
      if (formData.recurringEndDate) {
        const recurringEndDate = new Date(formData.recurringEndDate);
        
        if (isNaN(recurringEndDate.getTime())) {
          setError('A data de término da recorrência é inválida');
          setActiveStep(3);
          return false;
        }
        
        if (recurringEndDate <= recurringStartDate) {
          setError('A data de término da recorrência deve ser posterior à data de início');
          setActiveStep(3);
          return false;
        }
      }
    } 
    // Se não for recorrente e tiver data de agendamento, verificar se a data é válida
    else if (formData.scheduledDate) {
      const scheduledDate = new Date(formData.scheduledDate);
      const now = new Date();
      
      if (isNaN(scheduledDate.getTime())) {
        setError('A data de agendamento é inválida');
        setActiveStep(3);
        return false;
      }
      
      if (scheduledDate <= now) {
        setError('A data de agendamento deve ser futura');
        setActiveStep(3);
        return false;
      }
    }
    
    // Se chegou aqui, o formulário é válido
    return true;
  };
  
  // Enviar o formulário
  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      
      // Verificar se estamos na última etapa antes de prosseguir
      if (activeStep !== steps.length - 1) {
        console.log('Tentativa de submissão prematura no passo', activeStep);
        // Avançar para a etapa de agendamento se ainda não estiver nela
        setActiveStep(steps.length - 1);
        return;
      }
      
      if (!validateForm()) {
        return;
      }
      
      setIsSaving(true);
      setError(null);
      
      try {
        // Verificar se é campanha de envio imediato
        const isImmediateCampaign = formData.scheduledDate === null && !formData.isRecurring;
        console.log('É campanha de envio imediato?', isImmediateCampaign);

        // Criar objeto básico sem campos problemáticos
        let cleanData = {
          name: formData.name,
          description: formData.description,
          message: formData.message,
          status: 'draft'
        };
        
        // Adicionar seleção de contatos
        if (formData.sendToAll) {
          cleanData.sendToAll = true;
        } else {
          if (formData.contacts && formData.contacts.length > 0) {
            cleanData.contacts = formData.contacts;
          }
          if (formData.tags && formData.tags.length > 0) {
            cleanData.tags = formData.tags;
          }
        }
        
        // Adicionar configuração de agendamento
        if (isImmediateCampaign) {
          // Para envio imediato, definir sendNow como true e garantir que scheduledDate é null
          cleanData.sendNow = true;
        } else if (formData.isRecurring) {
          // Configuração para campanhas recorrentes
          cleanData.isRecurring = true;
          cleanData.recurringType = formData.recurringType;
          cleanData.recurringStartDate = formData.recurringStartDate ? new Date(formData.recurringStartDate).toISOString() : null;
          
          if (formData.recurringEndDate) {
            cleanData.recurringEndDate = new Date(formData.recurringEndDate).toISOString();
          }
          
          if (formData.recurringDays && formData.recurringDays.length > 0) {
            cleanData.recurringDays = formData.recurringDays.map(day => Number(day));
          }
          
          // Adicionar configurações de tempo
          cleanData.recurringHour = Number(formData.recurringHour || 12);
          cleanData.recurringMinute = Number(formData.recurringMinute || 0);
          cleanData.allowedTimeStart = Number(formData.allowedTimeStart || 8);
          cleanData.allowedTimeEnd = Number(formData.allowedTimeEnd || 20);
          
          if (formData.allowedDaysOfWeek && formData.allowedDaysOfWeek.length > 0) {
            cleanData.allowedDaysOfWeek = formData.allowedDaysOfWeek.map(day => Number(day));
          }
        } else {
          // Campanha com agendamento único
          cleanData.scheduledDate = new Date(formData.scheduledDate).toISOString();
        }
        
        console.log('Dados limpos a serem enviados:', JSON.stringify(cleanData, null, 2));
        
        let response;
        
        if (isEditMode) {
          response = await apiService.campaigns.update(id, cleanData);
        } else {
          response = await apiService.campaigns.create(cleanData);
        }
        
        console.log('Resposta ao salvar campanha:', response?.data ? JSON.stringify(response.data, null, 2) : response);
        
        // Se configuramos para envio imediato, iniciar a campanha imediatamente
        if (isImmediateCampaign && response.data && response.data._id) {
          console.log('Iniciando campanha imediatamente...');
          try {
            const startResponse = await apiService.campaigns.start(response.data._id);
            console.log('Campanha iniciada com sucesso:', startResponse);
          } catch (startError) {
            console.error('Erro ao iniciar campanha:', startError);
            // Continuar e apenas mostrar o erro no console, não quebrar o fluxo
          }
        }
        
        // Mostrar mensagem diferente para campanhas agendadas vs. imediatas
        let successMessage = '';
        if (formData.isRecurring) {
          successMessage = `Campanha recorrente ${isEditMode ? 'atualizada' : 'criada'} com sucesso!`;
        } else if (formData.scheduledDate) {
          const formattedDate = new Date(formData.scheduledDate).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          successMessage = `Campanha agendada para ${formattedDate} com sucesso!`;
        } else {
          successMessage = `Campanha ${isEditMode ? 'atualizada' : 'criada'} com sucesso! As mensagens serão enviadas imediatamente.`;
        }
        
        setSnackbar({
          open: true,
          message: successMessage,
          severity: 'success'
        });
        
        // Redirecionar após salvar
        setTimeout(() => {
          navigate('/campaigns');
        }, 2000);
      } catch (err) {
        console.error('Erro ao salvar campanha:', err);
        
        // Exibir detalhes mais específicos sobre o erro
        let errorMessage = err.message || 'Erro desconhecido';
        
        if (err.response?.data?.error) {
          errorMessage += `: ${err.response.data.error}`;
        } else if (err.response?.data?.message) {
          errorMessage += `: ${err.response.data.message}`;
        } else if (err.response?.status === 400) {
          errorMessage += ': Dados inválidos. Verifique os campos do formulário.';
        }
        
        setError(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} campanha: ${errorMessage}`);
        
        setSnackbar({
          open: true,
          message: `Erro ao ${isEditMode ? 'atualizar' : 'criar'} campanha: ${errorMessage}`,
          severity: 'error'
        });
      } finally {
        setIsSaving(false);
      }
    } catch (outerError) {
      // Capturar erros não tratados no procedimento de submissão
      console.error('Erro fatal durante a submissão do formulário:', outerError);
      handleGlobalError('Erro ao processar o formulário', outerError);
    }
  };
  
  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  // Voltar para a lista de campanhas
  const handleCancel = () => {
    navigate('/campaigns');
  };
  
  // Inicializar data padrão para o próximo dia às 9:00
  useEffect(() => {
    // Se não estamos em modo de edição, definir data padrão para o agendamento
    if (!isEditMode && !formData.scheduledDate) {
      // Data padrão: próximo dia útil às 9:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      // Verificar se a data é um final de semana
      const dayOfWeek = tomorrow.getDay();
      if (dayOfWeek === 0) { // Domingo
        tomorrow.setDate(tomorrow.getDate() + 1); // Segunda-feira
      } else if (dayOfWeek === 6) { // Sábado
        tomorrow.setDate(tomorrow.getDate() + 2); // Segunda-feira
      }
      
      setFormData(prev => ({
        ...prev,
        scheduledDate: tomorrow
      }));
    }
  }, [isEditMode]);
  
  // No modo de agendamento recorrente, definir data inicial padrão ao mudar o tipo
  useEffect(() => {
    if (formData.isRecurring && formData.recurringType && !formData.recurringStartDate) {
      // Data padrão: próximo dia útil às 9:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(formData.recurringHour || 9, formData.recurringMinute || 0, 0, 0);
      
      // Verificar se a data é um final de semana
      const dayOfWeek = tomorrow.getDay();
      if (dayOfWeek === 0) { // Domingo
        tomorrow.setDate(tomorrow.getDate() + 1); // Segunda-feira
      } else if (dayOfWeek === 6) { // Sábado
        tomorrow.setDate(tomorrow.getDate() + 2); // Segunda-feira
      }
      
      setFormData(prev => ({
        ...prev,
        recurringStartDate: tomorrow
      }));
    }
  }, [formData.isRecurring, formData.recurringType]);
  
  // Manipulador para valores de data com tratamento de erro mais preciso
  const handleDateChange = (fieldName, dateString, validationField) => {
    try {
      // Se o campo for limpo, apenas atualizar o estado
      if (!dateString) {
        setFormData(prev => ({ ...prev, [fieldName]: null }));
        // Limpar mensagem de erro relacionada
        if (error && (
          error.includes(validationField) || 
          error.includes('data') || 
          error.includes('futura')
        )) {
          setError(null);
        }
        return;
      }
      
      // Criar um novo objeto de data a partir do valor selecionado
      const dateValue = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(dateValue.getTime())) {
        console.error(`Data ${fieldName} inválida:`, dateString);
        setError(fieldName === 'scheduledDate' 
          ? ERROR_MESSAGES.DATE_INVALID 
          : fieldName === 'recurringStartDate' 
            ? ERROR_MESSAGES.RECURRING_START_INVALID
            : ERROR_MESSAGES.RECURRING_END_INVALID
        );
        return;
      }
      
      let errorMessage = null;
      
      // Validações específicas para cada campo
      if (fieldName === 'scheduledDate') {
        const now = new Date();
        if (dateValue <= now) {
          errorMessage = ERROR_MESSAGES.DATE_FUTURE;
        }
      } else if (fieldName === 'recurringStartDate') {
        const now = new Date();
        if (dateValue <= now) {
          errorMessage = ERROR_MESSAGES.RECURRING_START_FUTURE;
        }
      } else if (fieldName === 'recurringEndDate' && formData.recurringStartDate) {
        const startDate = new Date(formData.recurringStartDate);
        if (dateValue <= startDate) {
          errorMessage = ERROR_MESSAGES.RECURRING_END_AFTER_START;
        }
      }
      
      // Atualizar mensagem de erro ou limpar se não houver erro
      if (errorMessage) {
        setError(errorMessage);
      } else if (error && (
        error.includes(validationField) || 
        error.includes('data') || 
        error.includes('futura')
      )) {
        setError(null);
      }
      
      // Atualizar o estado com a nova data
      setFormData(prev => ({ ...prev, [fieldName]: dateValue }));
      
    } catch (err) {
      console.error(`Erro ao processar data ${fieldName}:`, err);
      setError(ERROR_MESSAGES.PROCESS_ERROR);
    }
  };
  
  // Funções auxiliares para renderização de mídia
  function renderMediaTypeLabel(mediaType) {
    switch (mediaType) {
      case 'image':
        return '🖼️ Imagem';
      case 'video':
        return '🎬 Vídeo';
      case 'audio':
        return '🎵 Áudio';
      case 'document':
        return '📄 Documento';
      default:
        return mediaType || 'Desconhecido';
    }
  }

  function renderMediaPreview(mediaType, mediaUrl) {
    if (!mediaUrl) return null;
    
    switch (mediaType) {
      case 'image':
        return (
          <Box sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
            <img 
              src={mediaUrl} 
              alt="Prévia da imagem" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '200px',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/300x200?text=Imagem+não+carregada';
              }}
            />
          </Box>
        );
      case 'video':
        return (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Vídeo será exibido no WhatsApp
            </Alert>
            <Button 
              variant="outlined" 
              size="small"
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Testar URL do vídeo
            </Button>
          </Box>
        );
      case 'audio':
        return (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Áudio será enviado no WhatsApp
            </Alert>
            <Button 
              variant="outlined" 
              size="small"
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Testar URL do áudio
            </Button>
          </Box>
        );
      case 'document':
        return (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Documento será enviado no WhatsApp
            </Alert>
            <Button 
              variant="outlined" 
              size="small"
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Testar URL do documento
            </Button>
          </Box>
        );
      default:
        return null;
    }
  }
  
  // Renderizar o formulário
  return (
    <Box>
      {internalError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Ocorreu um erro interno. Por favor, tente recarregar a página.
          <Button 
            onClick={() => window.location.reload()} 
            size="small" 
            sx={{ ml: 2 }}
          >
            Recarregar
          </Button>
        </Alert>
      )}
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          {isEditMode ? 'Editar Campanha' : 'Nova Campanha'}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleCancel}
        >
          Voltar
        </Button>
      </Box>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <form 
            onSubmit={handleSubmit} 
            onKeyDown={(e) => {
              // Prevenir submissão ao pressionar Enter em campos de texto
              if (e.key === 'Enter' && activeStep !== steps.length - 1) {
                e.preventDefault();
                // Navegar para o próximo passo se pressionar Enter em campos
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                  if (activeStep === 0 && formData.name) {
                    setError(null);
                    handleNext();
                  } else if (activeStep === 1 && formData.message) {
                    setError(null);
                    handleNext();
                  }
                }
              }
            }}
          >
            {/* Passo 1: Informações Básicas */}
            {activeStep === 0 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      name="name"
                      label="Nome da Campanha"
                      value={formData.name}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      name="description"
                      label="Descrição"
                      value={formData.description}
                      onChange={handleChange}
                      multiline
                      rows={3}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* Passo 2: Seleção de Mensagem */}
            {activeStep === 1 && (
              <Box>
                {messages.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Você não tem mensagens disponíveis. Crie uma nova mensagem para continuar.
                  </Alert>
                ) : (
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="message-label">Mensagem</InputLabel>
                    <Select
                      labelId="message-label"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      label="Mensagem"
                      required
                    >
                      {messages.map((message) => (
                        <MenuItem key={message._id} value={message._id}>
                          {message.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                
                {formData.message && (
                  <Box sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Prévia da Mensagem:</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {messages.find(m => m._id === formData.message)?.content || 'Mensagem não encontrada'}
                    </Typography>
                    
                    {messages.find(m => m._id === formData.message)?.mediaUrl && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>Tipo de Mídia:</strong> {renderMediaTypeLabel(messages.find(m => m._id === formData.message)?.mediaType)}
                        </Typography>
                        
                        {renderMediaPreview(
                          messages.find(m => m._id === formData.message)?.mediaType,
                          messages.find(m => m._id === formData.message)?.mediaUrl
                        )}
                        
                        <Typography variant="body2" sx={{ mt: 1, wordBreak: 'break-all', color: 'text.secondary' }}>
                          <strong>URL:</strong> {messages.find(m => m._id === formData.message)?.mediaUrl}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
                
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />} 
                  sx={{ mt: 3 }}
                  onClick={() => {
                    // Armazenar o caminho atual para retornar após criar a mensagem
                    window.history.replaceState(
                      { from: window.location.pathname },
                      document.title
                    );
                    navigate('/messages/new');
                  }}
                >
                  Criar Nova Mensagem
                </Button>
              </Box>
            )}
            
            {/* Passo 3: Destinatários */}
            {activeStep === 2 && (
              <Box>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  sx={{ mb: 3 }}
                >
                  <Tab label="Contatos Específicos" />
                  <Tab label="Tags" />
                  <Tab label="Todos os Contatos" />
                </Tabs>
                
                <TabPanel value={tabValue} index={0}>
                  <Box>
                    {isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          Carregando contatos...
                        </Typography>
                      </Box>
                    ) : contactList.length === 0 ? (
                      <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                          Nenhum contato disponível. Adicione contatos primeiro para continuar.
                        </Alert>
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/contacts/new')}
                          sx={{ mt: 2 }}
                        >
                          Adicionar Contato
                        </Button>
                        <Button 
                          variant="outlined" 
                          startIcon={<RefreshIcon />}
                          onClick={fetchContacts}
                          sx={{ mt: 2, ml: 2 }}
                        >
                          Tentar Novamente
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <Autocomplete
                          multiple
                          options={contactList}
                          value={selectedContacts}
                          onChange={handleContactsChange}
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            
                            const name = option.name || 'Sem nome';
                            const phone = option.phoneNumber || option.phone || 'Sem telefone';
                            return `${name} (${phone})`;
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Selecione os contatos"
                              placeholder="Buscar contatos"
                              helperText={`${contactList.length} contatos disponíveis`}
                            />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              <Box>
                                <Typography variant="body1">
                                  {option.name || 'Sem nome'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {option.phoneNumber || option.phone || 'Sem telefone'}
                                </Typography>
                              </Box>
                            </li>
                          )}
                          isOptionEqualToValue={(option, value) => {
                            const optionId = option._id || option.id;
                            const valueId = value._id || value.id;
                            return optionId === valueId;
                          }}
                          loading={isLoading}
                          loadingText="Carregando contatos..."
                          noOptionsText="Nenhum contato encontrado"
                          fullWidth
                        />
                        
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {selectedContacts.length} contatos selecionados
                          </Typography>
                          <Box>
                            <Button 
                              variant="outlined" 
                              startIcon={<AddIcon />}
                              size="small"
                              onClick={() => navigate('/contacts/new')}
                              sx={{ mr: 1 }}
                            >
                              Adicionar Contato
                            </Button>
                            <Button 
                              variant="outlined" 
                              startIcon={<RefreshIcon />}
                              size="small"
                              onClick={fetchContacts}
                            >
                              Recarregar
                            </Button>
                          </Box>
                        </Box>
                      </>
                    )}
                  </Box>
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Selecione tags para filtrar contatos. Apenas contatos com pelo menos uma das tags selecionadas serão incluídos na campanha.
                    </Typography>
                  </Box>
                  
                  <Autocomplete
                    multiple
                    options={availableTags}
                    value={selectedTags}
                    onChange={handleTagsChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Selecione as tags"
                        placeholder="Buscar tags"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option}
                          {...getTagProps({ index })}
                          key={option}
                        />
                      ))
                    }
                    loading={availableTags.length === 0}
                    loadingText="Carregando tags..."
                    noOptionsText="Nenhuma tag encontrada"
                  />
                  
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Estimativa de Contatos
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTags.length === 0 
                        ? 'Selecione pelo menos uma tag para ver a estimativa'
                        : `Aproximadamente ${contactsWithSelectedTags} contatos possuem as tags selecionadas`}
                    </Typography>
                  </Box>
                </TabPanel>
                
                <TabPanel value={tabValue} index={2}>
                  <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed #1976d2', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Enviar para todos os contatos
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      A campanha será enviada para todos os contatos ativos em sua base.
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      Total de contatos: <strong>{contactList.length}</strong>
                    </Typography>
                    
                    <Button
                      variant="contained"
                      color={formData.sendToAll ? "error" : "primary"}
                      sx={{ mt: 2 }}
                      onClick={() => {
                        const newValue = !formData.sendToAll;
                        setFormData(prev => ({ 
                          ...prev, 
                          sendToAll: newValue,
                          // Limpar outras seleções se "todos" estiver ativado
                          contacts: newValue ? [] : prev.contacts,
                          tags: newValue ? [] : prev.tags
                        }));
                        
                        if (newValue) {
                          setSelectedContacts([]);
                          setSelectedTags([]);
                        }
                      }}
                    >
                      {formData.sendToAll ? "Desativar envio para todos" : "Ativar envio para todos"}
                    </Button>
                    
                    {formData.sendToAll && (
                      <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                        Atenção: Esta opção enviará mensagens para TODOS os seus contatos. Use com cuidado!
                      </Alert>
                    )}
                  </Box>
                </TabPanel>
              </Box>
            )}
            
            {/* Passo 4: Agendamento */}
            {activeStep === 3 && (
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      name="isRecurring"
                      checked={formData.isRecurring}
                      onChange={handleCheckboxChange}
                    />
                  }
                  label="Campanha Recorrente"
                />
                
                {formData.isRecurring ? (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Configuração de Recorrência</Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel id="recurring-type-label">Tipo de Recorrência</InputLabel>
                          <Select
                            labelId="recurring-type-label"
                            name="recurringType"
                            value={formData.recurringType || ''}
                            onChange={handleChange}
                            label="Tipo de Recorrência"
                          >
                            <MenuItem value="">Selecione</MenuItem>
                            <MenuItem value="daily">Diária</MenuItem>
                            <MenuItem value="weekly">Semanal</MenuItem>
                            <MenuItem value="monthly">Mensal</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex' }}>
                          <TextField
                            label="Hora"
                            name="recurringHour"
                            type="number"
                            value={formData.recurringHour}
                            onChange={handleChange}
                            InputProps={{ inputProps: { min: 0, max: 23 } }}
                            sx={{ mr: 2 }}
                          />
                          <TextField
                            label="Minuto"
                            name="recurringMinute"
                            type="number"
                            value={formData.recurringMinute}
                            onChange={handleChange}
                            InputProps={{ inputProps: { min: 0, max: 59 } }}
                          />
                        </Box>
                      </Grid>
                      
                      {formData.recurringType === 'weekly' && (
                        <Grid item xs={12}>
                          <FormGroup>
                            <FormLabel component="legend">Dias da Semana</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
                              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, index) => (
                                <FormControlLabel
                                  key={day}
                                  control={
                                    <Checkbox
                                      checked={formData.recurringDays.includes(index)}
                                      onChange={handleRecurringDayChange}
                                      value={index}
                                    />
                                  }
                                  label={day}
                                />
                              ))}
                            </Box>
                          </FormGroup>
                        </Grid>
                      )}
                      
                      {formData.recurringType === 'monthly' && (
                        <Grid item xs={12}>
                          <FormLabel component="legend">Dias do Mês</FormLabel>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <Checkbox
                                key={day}
                                checked={formData.recurringDays.includes(day)}
                                onChange={handleRecurringDayChange}
                                value={day}
                                sx={{ p: 0.5 }}
                              />
                            ))}
                          </Box>
                        </Grid>
                      )}
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Data de Início"
                          type="datetime-local"
                          name="recurringStartDate"
                          value={formData.recurringStartDate ? new Date(formData.recurringStartDate).toISOString().slice(0, 16) : ''}
                          onChange={(e) => handleDateChange('recurringStartDate', e.target.value, 'início da recorrência')}
                          fullWidth
                          error={!formData.recurringStartDate && formData.isRecurring || (error && error.includes('início da recorrência'))}
                          helperText={
                            !formData.recurringStartDate && formData.isRecurring 
                              ? 'Data de início obrigatória' 
                              : (error && (error.includes('início da recorrência') || error.includes('data de início'))) 
                                ? error 
                                : 'A primeira execução ocorrerá nesta data'
                          }
                          InputLabelProps={{ shrink: true }}
                          inputProps={{
                            // Definir o mínimo como o momento atual + 5 minutos
                            min: (() => {
                              const minDate = new Date();
                              minDate.setMinutes(minDate.getMinutes() + 5);
                              return minDate.toISOString().slice(0, 16);
                            })()
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          label="Data de Término (opcional)"
                          type="datetime-local"
                          name="recurringEndDate"
                          value={formData.recurringEndDate ? new Date(formData.recurringEndDate).toISOString().slice(0, 16) : ''}
                          onChange={(e) => handleDateChange('recurringEndDate', e.target.value, 'término')}
                          fullWidth
                          error={error && error.includes('término')}
                          helperText={
                            (error && error.includes('término')) 
                              ? error 
                              : 'Se não definida, a campanha será executada indefinidamente'
                          }
                          InputLabelProps={{ shrink: true }}
                          disabled={!formData.recurringStartDate}
                          inputProps={{
                            min: formData.recurringStartDate 
                              ? new Date(new Date(formData.recurringStartDate).getTime() + 24*60*60*1000).toISOString().slice(0, 16) 
                              : ''
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Agendamento</Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          name="sendNow"
                          checked={!formData.scheduledDate}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Se "Enviar agora" for ativado, limpar a data de agendamento
                              setFormData(prev => ({ ...prev, scheduledDate: null }));
                              setError(null);
                            } else {
                              // Definir uma data futura padrão
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              tomorrow.setHours(9, 0, 0, 0);
                              setFormData(prev => ({ ...prev, scheduledDate: tomorrow }));
                            }
                          }}
                        />
                      }
                      label="Enviar agora (sem agendamento)"
                    />
                    
                    {formData.scheduledDate !== null && (
                      <TextField
                        label="Data e Hora de Envio"
                        type="datetime-local"
                        name="scheduledDate"
                        value={formData.scheduledDate ? new Date(formData.scheduledDate).toISOString().slice(0, 16) : ''}
                        onChange={(e) => handleDateChange('scheduledDate', e.target.value, 'data de agendamento')}
                        fullWidth
                        error={error && (error.includes('data de agendamento') || error.includes('futura'))}
                        helperText={
                          (error && (error.includes('data de agendamento') || error.includes('futura') || error.includes('data')))
                            ? error
                            : 'A campanha será enviada automaticamente nesta data e hora'
                        }
                        sx={{ mt: 2, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{
                          // Definir o mínimo como o momento atual + 5 minutos
                          min: (() => {
                            const minDate = new Date();
                            minDate.setMinutes(minDate.getMinutes() + 5);
                            return minDate.toISOString().slice(0, 16);
                          })()
                        }}
                      />
                    )}
                    
                    {formData.scheduledDate === null && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        A campanha será enviada imediatamente após a criação
                      </Alert>
                    )}
                    
                    {formData.scheduledDate && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Sua campanha será enviada em {new Date(formData.scheduledDate).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}.
                      </Alert>
                    )}
                  </Box>
                )}
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="h6" sx={{ mb: 2 }}>Restrições de Envio</Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormGroup>
                      <FormLabel component="legend">Dias Permitidos</FormLabel>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, index) => (
                          <FormControlLabel
                            key={day}
                            control={
                              <Checkbox
                                checked={formData.allowedDaysOfWeek.includes(index)}
                                onChange={handleDayOfWeekChange}
                                value={index}
                              />
                            }
                            label={day}
                          />
                        ))}
                      </Box>
                    </FormGroup>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormLabel component="legend">Horário Permitido</FormLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TextField
                        label="De"
                        name="allowedTimeStart"
                        type="number"
                        value={formData.allowedTimeStart}
                        onChange={handleChange}
                        InputProps={{ inputProps: { min: 0, max: 23 } }}
                        sx={{ mr: 2 }}
                      />
                      <TextField
                        label="Até"
                        name="allowedTimeEnd"
                        type="number"
                        value={formData.allowedTimeEnd}
                        onChange={handleChange}
                        InputProps={{ inputProps: { min: 0, max: 23 } }}
                      />
                      <Typography variant="body2" sx={{ ml: 2 }}>
                        horas
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              {activeStep > 0 && (
                <Button 
                  onClick={(e) => {
                    e.preventDefault(); // Prevenir comportamento padrão
                    handleBack();
                  }} 
                  variant="outlined"
                  type="button"
                >
                  Voltar
                </Button>
              )}
              
              {activeStep < steps.length - 1 ? (
                <Button 
                  onClick={(e) => {
                    // Prevenir comportamento padrão para evitar submissão acidental
                    e.preventDefault();
                    
                    // Validar etapa atual antes de avançar
                    switch (activeStep) {
                      case 0: // Informações básicas
                        if (!formData.name) {
                          setError('O nome da campanha é obrigatório');
                          return;
                        }
                        break;
                      case 1: // Mensagem
                        if (!formData.message) {
                          setError('Você deve selecionar uma mensagem');
                          return;
                        }
                        break;
                      case 2: // Contatos
                        if (!formData.sendToAll && formData.contacts.length === 0 && formData.tags.length === 0) {
                          setError('Você deve selecionar contatos específicos, tags ou ativar "enviar para todos"');
                          return;
                        }
                        break;
                    }
                    setError(null);
                    handleNext();
                  }}
                  variant="contained"
                  sx={{ ml: 'auto' }}
                  type="button" // Explicitar que é um botão tipo button, não submit
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  disabled={isSaving || (
                    // Desabilitar botão se for recorrente e não tiver configuração completa
                    formData.isRecurring && (!formData.recurringStartDate || !formData.recurringType)
                  )}
                  sx={{ ml: 'auto', mr: 1 }}
                >
                  {isSaving ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Salvando...
                    </>
                  ) : (
                    isEditMode ? 'Atualizar Campanha' : 'Criar Campanha'
                  )}
                </Button>
              )}
            </Box>
          </form>
        </Paper>
      )}
      
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

export default CampaignForm; 