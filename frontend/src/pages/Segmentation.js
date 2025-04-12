import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Grid,
  Divider,
  Card,
  CardContent,
  CardHeader,
  FormGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  FilterList as FilterListIcon,
  Tag as TagIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import apiService from '../services/api';
import { formatPhone } from '../utils/format';

// Import needed at render time
const { TableContainer, TableHead, TableBody, TableRow, TableCell, Table } = require('@mui/material');

const steps = ['Definir Critérios', 'Revisar Segmento', 'Salvar Segmento'];

function SegmentationForm() {
  const [activeStep, setActiveStep] = useState(0);
  const [segmentName, setSegmentName] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [previewResults, setPreviewResults] = useState({
    count: 0,
    sample: []
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [segmentCreated, setSegmentCreated] = useState(false);

  // Obter tags e campanhas disponíveis ao carregar a página
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar contatos para extrair tags únicas
        const contactsResponse = await apiService.contacts.getAll({ limit: 100 });
        const tags = new Set();
        
        if (contactsResponse?.data?.data) {
          contactsResponse.data.data.forEach(contact => {
            if (contact.tags && Array.isArray(contact.tags)) {
              contact.tags.forEach(tag => tags.add(tag));
            }
          });
        }
        
        setAvailableTags(Array.from(tags));
        
        // Buscar campanhas
        const campaignsResponse = await apiService.campaigns.getAll();
        
        if (campaignsResponse?.data?.data) {
          setCampaignOptions(campaignsResponse.data.data.map(campaign => ({
            id: campaign._id,
            name: campaign.name
          })));
        }
      } catch (err) {
        console.error('Erro ao carregar dados iniciais:', err);
        setError('Falha ao carregar dados. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const criteriaOptions = [
    { id: 'hasTag', label: 'Possui Tag', field: 'tags', operator: 'in' },
    { id: 'notHasTag', label: 'Não Possui Tag', field: 'tags', operator: 'nin' },
    { id: 'readMessage', label: 'Leu Mensagem', special: 'readMessage' },
    { id: 'notReadMessage', label: 'Não Leu Mensagem', special: 'notReadMessage' },
    { id: 'name', label: 'Nome Contém', field: 'name', operator: 'contains' },
    { id: 'email', label: 'Email Contém', field: 'email', operator: 'contains' },
    { id: 'phoneArea', label: 'Telefone (DDD)', field: 'phoneNumber', operator: 'startsWith' },
    { id: 'createdAfter', label: 'Criado Após', field: 'createdAt', operator: 'greaterThan' },
    { id: 'createdBefore', label: 'Criado Antes', field: 'createdAt', operator: 'lessThan' },
  ];

  const addCriteria = (criteriaId) => {
    const criteria = criteriaOptions.find(c => c.id === criteriaId);
    if (criteria) {
      setSelectedCriteria([...selectedCriteria, { 
        id: criteriaId, 
        field: criteria.field,
        operator: criteria.operator,
        special: criteria.special,
        value: null 
      }]);
    }
  };

  const removeCriteria = (index) => {
    const newCriteria = [...selectedCriteria];
    newCriteria.splice(index, 1);
    setSelectedCriteria(newCriteria);
  };

  const updateCriteriaValue = (index, value) => {
    const newCriteria = [...selectedCriteria];
    newCriteria[index].value = value;
    setSelectedCriteria(newCriteria);
  };

  const handleTagDelete = (tagToDelete) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToDelete));
  };

  const handleTagAdd = () => {
    if (newTagName && !selectedTags.includes(newTagName)) {
      setSelectedTags([...selectedTags, newTagName]);
      setNewTagName('');
    }
  };

  const handleNext = async () => {
    if (activeStep === 0 && selectedCriteria.length > 0) {
      // Ao avançar para o passo de revisão, buscar uma prévia dos resultados
      await previewSegment();
    } else if (activeStep === steps.length - 1) {
      // Último passo - criar o segmento
      await createSegment();
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const previewSegment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Converter critérios para o formato da API
      const apiCriteria = selectedCriteria
        .filter(c => c.value !== null)
        .map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value
        }));
      
      // Verificar critérios especiais
      const hasReadMessageCriteria = selectedCriteria.some(c => c.special === 'readMessage' && c.value);
      
      // Usar a API de segmentação para obter uma prévia
      let response;
      
      if (hasReadMessageCriteria) {
        // Usar API específica para contatos que leram mensagens
        const messageIds = selectedCriteria
          .filter(c => c.special === 'readMessage')
          .map(c => c.value);
          
        response = await apiService.segmentation.getContactsWhoReadMessages({
          messageIds,
          minReadCount: 1
        });
      } else {
        // API padrão de segmentação
        response = await apiService.segmentation.segmentContacts({ criteria: apiCriteria });
      }
      
      if (response?.data) {
        setPreviewResults({
          count: response.data.count,
          sample: response.data.data.slice(0, 10) // Limitar a 10 para prévia
        });
      }
    } catch (err) {
      console.error('Erro ao gerar prévia do segmento:', err);
      setError('Falha ao gerar prévia do segmento. Verifique seus critérios.');
      
      // Definir dados vazios em caso de erro
      setPreviewResults({
        count: 0,
        sample: []
      });
    } finally {
      setLoading(false);
    }
  };

  const createSegment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Converter critérios para o formato da API
      const apiCriteria = selectedCriteria
        .filter(c => c.value !== null)
        .map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value
        }));
      
      // Criar o segmento via API
      const response = await apiService.segmentation.createContactSegment({
        criteria: apiCriteria,
        tags: selectedTags,
        segmentName,
        description: `Segmento criado com ${selectedCriteria.length} critérios`
      });
      
      if (response?.data?.success) {
        setSegmentCreated(true);
      } else {
        throw new Error(response?.data?.message || 'Erro desconhecido ao criar segmento');
      }
    } catch (err) {
      console.error('Erro ao criar segmento:', err);
      setError(`Falha ao criar segmento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSegmentName('');
    setSelectedTags([]);
    setSelectedCriteria([]);
    setPreviewResults({ count: 0, sample: [] });
    setSegmentCreated(false);
  };

  const getCriteriaLabel = (criteria) => {
    const option = criteriaOptions.find(opt => opt.id === criteria.id);
    if (!option) return '';

    let label = option.label;
    if (criteria.value) {
      if (['hasTag', 'notHasTag'].includes(criteria.id)) {
        label += `: ${criteria.value}`;
      } else if (['readMessage', 'notReadMessage'].includes(criteria.id)) {
        const campaign = campaignOptions.find(c => c.id === criteria.value);
        if (campaign) {
          label += `: ${campaign.name}`;
        }
      } else if (criteria.id === 'phoneArea') {
        label += `: ${criteria.value}`;
      } else if (['createdAfter', 'createdBefore'].includes(criteria.id)) {
        const date = new Date(criteria.value);
        label += `: ${date.toLocaleDateString()}`;
      } else {
        label += `: ${criteria.value}`;
      }
    }
    return label;
  };

  const renderCriteriaForm = (criteria, index) => {
    switch (criteria.id) {
      case 'hasTag':
      case 'notHasTag':
        return (
          <FormControl fullWidth margin="normal">
            <InputLabel>Selecione a Tag</InputLabel>
            <Select
              value={criteria.value || ''}
              onChange={(e) => updateCriteriaValue(index, e.target.value)}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'readMessage':
      case 'notReadMessage':
        return (
          <FormControl fullWidth margin="normal">
            <InputLabel>Selecione a Campanha</InputLabel>
            <Select
              value={criteria.value || ''}
              onChange={(e) => updateCriteriaValue(index, e.target.value)}
            >
              {campaignOptions.map((campaign) => (
                <MenuItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'name':
      case 'email':
        return (
          <TextField
            fullWidth
            margin="normal"
            label={`Texto para buscar no ${criteria.id === 'name' ? 'nome' : 'email'}`}
            value={criteria.value || ''}
            onChange={(e) => updateCriteriaValue(index, e.target.value)}
          />
        );
      case 'phoneArea':
        return (
          <TextField
            fullWidth
            margin="normal"
            label="DDD (ex: 11, 21, 31)"
            value={criteria.value || ''}
            onChange={(e) => updateCriteriaValue(index, `55${e.target.value}`)}
            inputProps={{ maxLength: 2 }}
          />
        );
      case 'createdAfter':
      case 'createdBefore':
        return (
          <TextField
            fullWidth
            margin="normal"
            label="Data"
            type="date"
            value={criteria.value || ''}
            onChange={(e) => updateCriteriaValue(index, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {activeStep === steps.length ? (
        <Box>
          {segmentCreated ? (
            <>
              <Typography variant="h5" gutterBottom>
                Segmento criado com sucesso!
              </Typography>
              <Typography variant="subtitle1">
                O segmento "{segmentName}" foi criado com {previewResults.count} contatos.
                As tags {selectedTags.join(', ')} foram aplicadas.
              </Typography>
            </>
          ) : (
            <Typography variant="h5" color="error">
              Ocorreu um erro ao criar o segmento. Por favor, tente novamente.
            </Typography>
          )}
          <Button onClick={handleReset} sx={{ mt: 3, mr: 1 }}>
            Criar Novo Segmento
          </Button>
        </Box>
      ) : (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {activeStep === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader title="Critérios de Segmentação" />
                      <Divider />
                      <CardContent>
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Adicionar Critério</InputLabel>
                          <Select
                            value=""
                            onChange={(e) => addCriteria(e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="" disabled>
                              Selecione um critério
                            </MenuItem>
                            {criteriaOptions.map((option) => (
                              <MenuItem key={option.id} value={option.id}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {selectedCriteria.length > 0 && (
                          <List sx={{ mt: 2 }}>
                            {selectedCriteria.map((criteria, index) => (
                              <Paper key={index} sx={{ mb: 2, p: 2 }}>
                                <Typography variant="subtitle1">
                                  {getCriteriaLabel(criteria)}
                                </Typography>
                                {renderCriteriaForm(criteria, index)}
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => removeCriteria(index)}
                                  sx={{ mt: 1 }}
                                >
                                  Remover
                                </Button>
                              </Paper>
                            ))}
                          </List>
                        )}

                        {selectedCriteria.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Adicione critérios para segmentar seus contatos.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader title="Tags a Serem Aplicadas" />
                      <Divider />
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TextField
                            label="Nova Tag"
                            variant="outlined"
                            fullWidth
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            size="small"
                          />
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleTagAdd}
                            startIcon={<AddIcon />}
                            sx={{ ml: 1 }}
                          >
                            Adicionar
                          </Button>
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 2 }}>
                          {selectedTags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              onDelete={() => handleTagDelete(tag)}
                              sx={{ m: 0.5 }}
                            />
                          ))}
                        </Box>

                        {selectedTags.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Adicione tags para aplicar aos contatos segmentados.
                          </Typography>
                        )}

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="subtitle1" gutterBottom>
                          Tags Disponíveis
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                          {availableTags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              onClick={() => {
                                if (!selectedTags.includes(tag)) {
                                  setSelectedTags([...selectedTags, tag]);
                                }
                              }}
                              sx={{ m: 0.5 }}
                              variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                              color={selectedTags.includes(tag) ? 'primary' : 'default'}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {activeStep === 1 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardHeader title="Revisar Segmento" />
                      <Divider />
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Critérios Selecionados:
                        </Typography>
                        <List>
                          {selectedCriteria.map((criteria, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={getCriteriaLabel(criteria)} />
                            </ListItem>
                          ))}
                        </List>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1" gutterBottom>
                          Tags a Serem Aplicadas:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
                          {selectedTags.map((tag) => (
                            <Chip key={tag} label={tag} sx={{ m: 0.5 }} />
                          ))}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1" gutterBottom>
                          Pré-visualização de Resultados ({previewResults.count} contatos):
                        </Typography>
                        
                        {previewResults.sample.length > 0 ? (
                          <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Nome</TableCell>
                                  <TableCell>Telefone</TableCell>
                                  <TableCell>Tags Atuais</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {previewResults.sample.map((contact) => (
                                  <TableRow key={contact._id}>
                                    <TableCell>{contact.name || 'Sem nome'}</TableCell>
                                    <TableCell>{formatPhone(contact.phoneNumber)}</TableCell>
                                    <TableCell>
                                      {contact.tags && contact.tags.length > 0 ? (
                                        contact.tags.map((tag) => (
                                          <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                                        ))
                                      ) : (
                                        <Typography variant="caption" color="text.secondary">
                                          Nenhuma tag
                                        </Typography>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            Nenhum contato encontrado com estes critérios.
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {activeStep === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardHeader title="Salvar Segmento" />
                      <Divider />
                      <CardContent>
                        <TextField
                          label="Nome do Segmento"
                          variant="outlined"
                          fullWidth
                          value={segmentName}
                          onChange={(e) => setSegmentName(e.target.value)}
                          margin="normal"
                          helperText="Dê um nome para identificar este segmento"
                        />

                        <FormGroup sx={{ mt: 2 }}>
                          <FormControlLabel
                            control={<Checkbox defaultChecked />}
                            label="Aplicar tags automaticamente aos contatos"
                          />
                          <FormControlLabel
                            control={<Checkbox />}
                            label="Atualizar segmento automaticamente quando novos contatos atenderem aos critérios"
                          />
                        </FormGroup>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body2" color="text.secondary">
                          Este segmento aplicará as tags {selectedTags.join(', ')} a {previewResults.count} contatos 
                          que atendem aos critérios definidos.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                {activeStep !== 0 && (
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Voltar
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={
                    (activeStep === 0 && (selectedCriteria.length === 0 || selectedTags.length === 0)) ||
                    (activeStep === 2 && !segmentName)
                  }
                >
                  {activeStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

function Segmentation() {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h4" gutterBottom>
        Segmentação de Contatos
      </Typography>
      <Paper sx={{ p: 3 }}>
        <SegmentationForm />
      </Paper>
    </Box>
  );
}

export default Segmentation; 