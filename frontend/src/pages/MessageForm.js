import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
  Input,
  FormHelperText,
  Tooltip,
  Snackbar,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  CloudUpload as CloudUploadIcon,
  Send as SendIcon
} from '@mui/icons-material';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function MessageForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // Estados do formulário
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mediaType: '',
    mediaUrl: '',
    buttons: [],
    footer: '',
    header: ''
  });
  
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [preview, setPreview] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  // Adicionando estado para snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' // 'success', 'error', 'warning', 'info'
  });

  // Buscar mensagem se estiver no modo de edição
  useEffect(() => {
    if (isEditMode) {
      fetchMessage();
    }
  }, [id]);

  const fetchMessage = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.messages.getById(id);
      
      if (!response?.data) {
        throw new Error('Não foi possível carregar os dados da mensagem');
      }
      
      const message = response.data;
      
      // Preencher formulário com os dados da mensagem
      setFormData({
        title: message.title || '',
        content: message.content || '',
        mediaType: message.mediaType || '',
        mediaUrl: message.mediaUrl || '',
        buttons: message.buttons || [],
        footer: message.footer || '',
        header: message.header || ''
      });
    } catch (err) {
      console.error('Erro ao carregar mensagem:', err);
      setError('Erro ao carregar dados da mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar campo do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Função para lidar com mudanças no tipo de mídia
  const handleMediaTypeChange = (e) => {
    const newMediaType = e.target.value;
    setFormData(prev => ({
      ...prev,
      mediaType: newMediaType
    }));
    
    // Validar compatibilidade entre URL e tipo de mídia
    if (formData.mediaUrl && newMediaType) {
      validateMediaUrl(formData.mediaUrl, newMediaType);
    }
  };

  // Função para validar tamanho do arquivo (15MB máximo)
  const validateFileSize = (file) => {
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB em bytes
    if (file.size > MAX_SIZE) {
      setError(`O arquivo excede o tamanho máximo permitido de 15MB. Tamanho atual: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return false;
    }
    return true;
  };

  // Função para lidar com a seleção de arquivos
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    console.log("Arquivo selecionado:", selectedFile.name, selectedFile.type, selectedFile.size);
    
    // Validar tamanho do arquivo
    if (!validateFileSize(selectedFile)) {
      // Limpar seleção de arquivo se for grande demais
      e.target.value = '';
      return;
    }

    // Guardar referência ao arquivo
    setFile(selectedFile);
    
    // Determinar o tipo de mídia com base no tipo do arquivo
    let mediaType = '';
    if (selectedFile.type.startsWith('image/')) {
      mediaType = 'image';
    } else if (selectedFile.type.startsWith('video/')) {
      mediaType = 'video';
    } else if (selectedFile.type.startsWith('audio/')) {
      mediaType = 'audio';
    } else {
      mediaType = 'document';
    }
    
    try {
      // Criar uma URL temporária para o arquivo selecionado
      const objectUrl = URL.createObjectURL(selectedFile);
      
      // Atualizar o estado do formulário com a URL e o tipo de mídia
      setFormData(prev => ({
        ...prev,
        mediaUrl: objectUrl,
        mediaType: mediaType
      }));
      
      console.log(`Arquivo convertido para URL temporária: ${objectUrl}`);
    } catch (err) {
      console.error("Erro ao criar URL do objeto:", err);
      setError(`Erro ao processar arquivo: ${err.message}`);
      e.target.value = '';
    }
  };

  // Converter arquivo para base64
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Nenhum arquivo fornecido para conversão'));
        return;
      }
      
      try {
        const reader = new FileReader();
        
        reader.onload = () => {
          try {
            const dataUrl = reader.result;
            
            // Extrair o tipo MIME e os dados base64 da dataURL
            const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
            
            if (!matches || matches.length !== 3) {
              reject(new Error('Falha ao processar base64 - formato inválido'));
              return;
            }
            
            const mimeType = matches[1];
            const base64Data = matches[2];
            
            // Retorna um objeto com todas as informações úteis
            resolve({
              dataUrl,          // URL completa (data:mime;base64,DADOS)
              mimeType,         // Tipo MIME (image/jpeg, etc.)
              base64Data,       // Apenas os dados em base64, sem o prefixo
              mediaType: mimeType.split('/')[0] // image, video, audio, application
            });
          } catch (error) {
            console.error('Erro ao processar resultado do FileReader:', error);
            reject(error);
          }
        };
        
        reader.onerror = (error) => {
          console.error('Erro ao ler arquivo:', error);
          reject(new Error('Falha ao ler o arquivo'));
        };
        
        reader.onabort = () => {
          console.error('Leitura do arquivo foi abortada');
          reject(new Error('Leitura do arquivo foi abortada'));
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Erro ao iniciar leitura do arquivo:', error);
        reject(error);
      }
    });
  };

  // Função para validar URL de mídia
  const validateMediaUrl = (url, mediaType) => {
    console.log(`Validando URL: ${url} para tipo: ${mediaType}`);
    
    if (!url) {
      setError('URL de mídia não fornecida');
      return false;
    }
    
    // Se for uma URL de objeto local (blob:)
    if (url.startsWith('blob:')) {
      console.log('URL local detectada, considerando válida');
      return true;
    }
    
    // Verificar se é uma URL válida
    try {
      new URL(url);
    } catch (e) {
      setError('URL inválida: ' + e.message);
      return false;
    }
    
    // Verifica se a URL corresponde ao tipo de mídia especificado
    const simpleValidation = {
      image: /\.(jpeg|jpg|gif|png|webp)($|\?)/i,
      video: /\.(mp4|mov|avi|wmv|webm)($|\?)/i,
      audio: /\.(mp3|wav|ogg|m4a)($|\?)/i,
      document: /\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx)($|\?)/i
    };
    
    // Faz uma validação básica para evitar erros óbvios
    if (mediaType && simpleValidation[mediaType]) {
      if (!simpleValidation[mediaType].test(url) && !url.includes('base64') && !url.startsWith('blob:')) {
        console.warn(`URL pode não ser compatível com o tipo de mídia ${mediaType}`);
        // Não bloqueamos, apenas alertamos no console
      }
    }
    
    return true;
  };
  
  // Função para lidar com mudanças na URL de mídia
  const handleMediaUrlChange = (e) => {
    const newUrl = e.target.value;
    setFormData(prev => ({
      ...prev,
      mediaUrl: newUrl
    }));
    
    // Validar URL se um tipo de mídia já estiver selecionado
    if (newUrl && formData.mediaType) {
      validateMediaUrl(newUrl, formData.mediaType);
    }
  };
  
  // Função para renderizar prévia do conteúdo de mídia
  const renderMediaPreview = () => {
    if (!formData.mediaUrl && !file) return null;
    
    // Se tiver arquivo selecionado mas não URL, criar uma URL temporária
    let previewUrl = formData.mediaUrl;
    if (!previewUrl && file && formData.mediaType === 'image') {
      previewUrl = URL.createObjectURL(file);
    }
    
    if (!previewUrl) return null;
    
    switch (formData.mediaType) {
      case 'image':
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="subtitle2" gutterBottom>Prévia da Imagem:</Typography>
            <img 
              src={previewUrl} 
              alt="Prévia da imagem" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '200px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '4px'
              }} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/300x200?text=Imagem+não+disponível';
                
                // Informar o usuário sobre o problema
                setError('Não foi possível carregar a imagem. Verifique se a URL está correta e acessível.');
              }}
            />
          </Box>
        );
        
      case 'video':
        // Se for uma URL base64 de vídeo, podemos mostrar um player
        if (previewUrl.startsWith('data:video/')) {
          return (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Prévia do Vídeo:
              </Typography>
              <video 
                controls 
                src={previewUrl} 
                style={{ maxWidth: '100%', maxHeight: '200px' }}
              />
            </Box>
          );
        }
        
        // URL externa de vídeo
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tipo de mídia: Vídeo
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              O vídeo será enviado no WhatsApp. Não é possível exibir prévia de URLs externas aqui.
            </Alert>
            <Button 
              variant="outlined" 
              size="small"
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 1 }}
            >
              Verificar URL
            </Button>
          </Box>
        );
      
      case 'audio':
        // Se for uma URL base64 de áudio, podemos mostrar um player
        if (previewUrl.startsWith('data:audio/')) {
          return (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Prévia do Áudio:
              </Typography>
              <audio 
                controls 
                src={previewUrl} 
                style={{ width: '100%' }}
              />
            </Box>
          );
        }
        
        // URL externa de áudio
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tipo de mídia: Áudio
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              O áudio será enviado no WhatsApp. Não é possível exibir prévia de URLs externas aqui.
            </Alert>
            <Button 
              variant="outlined" 
              size="small"
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 1 }}
            >
              Verificar URL
            </Button>
          </Box>
        );
      
      case 'document':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tipo de mídia: Documento
            </Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              {file 
                ? `O documento "${file.name}" será enviado no WhatsApp`
                : 'O documento será enviado no WhatsApp. Não é possível exibir prévia aqui.'}
            </Alert>
            {!file && (
              <Button 
                variant="outlined" 
                size="small"
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 1 }}
              >
                Verificar URL
              </Button>
            )}
          </Box>
        );
      
      default:
        return null;
    }
  };

  // Adicionar esta função de validação acima do handleSubmit
  const validateForm = () => {
    // Verificar se há um título
    if (!formData.title || formData.title.trim() === '') {
      setError('O título da mensagem é obrigatório');
      return false;
    }

    // Verificar se há conteúdo
    if (!formData.content || formData.content.trim() === '') {
      setError('O conteúdo da mensagem é obrigatório');
      return false;
    }

    // Verificar consistência de mídia
    if (formData.mediaType && !formData.mediaUrl && !file) {
      setError('Você selecionou um tipo de mídia, mas não forneceu um arquivo ou URL');
      return false;
    }

    // Limpar erro se tudo estiver válido
    setError(null);
    return true;
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar formulário
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      console.log('Iniciando o processo de salvar mensagem');
      
      // Preparar dados da mensagem
      let messageData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        footer: formData.footer || null,
        header: formData.header || null
      };

      // Processar dados de mídia
      if (formData.mediaType) {
        messageData.mediaType = formData.mediaType;
        
        // Verificar se temos um arquivo ou URL
        if (file) {
          console.log('Arquivo de mídia detectado, convertendo para base64');
          try {
            // Converter arquivo para base64
            const base64Info = await convertFileToBase64(file);
            
            if (base64Info) {
              // Adicionar dados base64 ao messageData
              messageData.mediaBase64 = base64Info.base64Data;
              messageData.mediaMimeType = base64Info.mimeType;
              messageData.mediaUrl = base64Info.dataUrl; // Mantemos a URL completa também
              
              // Adicionar payload Evolution API para usar no backend
              messageData.evolutionPayload = {
                mediatype: formData.mediaType,
                mimetype: base64Info.mimeType,
                media: base64Info.base64Data,
                caption: formData.content || ''
              };
              
              console.log('Arquivo convertido para base64 com sucesso');
            }
          } catch (err) {
            console.error('Erro ao converter arquivo para base64:', err);
            setError('Erro ao processar arquivo de mídia. Tente novamente.');
            setIsSaving(false);
            return;
          }
        } 
        // Se não for arquivo, usar a URL diretamente
        else if (formData.mediaUrl) {
          // Verificar se a URL já é base64
          if (formData.mediaUrl.startsWith('data:')) {
            // Extrair tipo MIME e dados base64
            const matches = formData.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const [, mimeType, base64Content] = matches;
              
              // Adicionar dados base64 ao messageData
              messageData.mediaBase64 = base64Content;
              messageData.mediaMimeType = mimeType;
              messageData.mediaUrl = formData.mediaUrl;
              
              // Adicionar payload Evolution API
              messageData.evolutionPayload = {
                mediatype: formData.mediaType,
                mimetype: mimeType,
                media: base64Content,
                caption: formData.content || ''
              };
            }
          } else {
            messageData.mediaUrl = formData.mediaUrl;
            
            // Adicionar payload Evolution API para URL externa
            messageData.evolutionPayload = {
              mediatype: formData.mediaType,
              url: formData.mediaUrl,
              caption: formData.content || ''
            };
            
            console.log('Usando URL de mídia diretamente:', formData.mediaUrl);
          }
        }
      }
      
      // Remover campos null ou undefined
      Object.keys(messageData).forEach(key => {
        if (messageData[key] === null || messageData[key] === undefined) {
          delete messageData[key];
        }
      });
      
      console.log('Dados da mensagem preparados:', messageData);

      let salvouComSucesso = false;
      let mensagemErro = '';
      
      // Primeira tentativa: usando fetch diretamente
      try {
        // Obter o token do usuário do localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Usuário não autenticado');
        }
        
        // Construir URL correta - verificar se o API_BASE_URL já termina com /api
        const baseUrl = API_BASE_URL.endsWith('/api') 
          ? API_BASE_URL 
          : `${API_BASE_URL}/api`;
        
        const url = id 
          ? `${baseUrl}/messages/${id}` 
          : `${baseUrl}/messages`;
        
        const method = id ? 'PUT' : 'POST';
        
        console.log(`[TENTATIVA 1 - FETCH] Enviando requisição ${method} para ${url}`);
        console.log('Payload:', JSON.stringify(messageData));
        
        const fetchResponse = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(messageData)
        });
        
        const responseText = await fetchResponse.text();
        console.log('Resposta bruta do servidor (fetch):', responseText);
        
        if (!fetchResponse.ok) {
          mensagemErro = `Erro ao salvar mensagem: ${fetchResponse.status} ${fetchResponse.statusText}. Detalhes: ${responseText}`;
          console.error(mensagemErro);
          // Não lançamos um erro aqui para poder tentar a segunda abordagem
        } else {
          salvouComSucesso = true;
          console.log('Mensagem salva com sucesso usando fetch direto!');
        }
      } catch (fetchError) {
        console.error('Erro na primeira tentativa (fetch):', fetchError);
        mensagemErro = `Erro na tentativa com fetch: ${fetchError.message}`;
      }
      
      // Segunda tentativa: usando apiService se a primeira falhou
      if (!salvouComSucesso) {
        try {
          console.log('[TENTATIVA 2 - API SERVICE] Tentando salvar mensagem via apiService');
          
          let response;
          if (id) {
            response = await apiService.messages.update(id, messageData);
          } else {
            response = await apiService.messages.create(messageData);
          }
          
          console.log('Resposta do apiService:', response);
          salvouComSucesso = true;
        } catch (apiError) {
          console.error('Erro na segunda tentativa (apiService):', apiError);
          
          // Se ambas as tentativas falharam, usamos a segunda mensagem de erro
          // que provavelmente é mais descritiva
          mensagemErro = `Erro na tentativa com apiService: ${apiError.message || apiError}`;
        }
      }
      
      // Verificar o resultado das tentativas
      if (salvouComSucesso) {
        setSuccess(`Mensagem ${isEditMode ? 'atualizada' : 'criada'} com sucesso!`);
        toast.success(`Mensagem ${isEditMode ? 'atualizada' : 'criada'} com sucesso!`);
        
        // Aguardar um pouco antes de navegar
        setTimeout(() => {
          navigate('/messages');
        }, 1500);
      } else {
        // Se ambas as tentativas falharam, mostrar erro
        throw new Error(mensagemErro);
      }
      
    } catch (error) {
      console.error('Erro completo:', error);
      setError(`Erro ao salvar mensagem: ${error.message}`);
      toast.error(`Erro ao salvar mensagem: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Voltar para a tela anterior
  const handleCancel = () => {
    if (window.history.state?.from) {
      navigate(window.history.state.from);
    } else {
      navigate('/campaigns');
    }
  };

  // Alternar visualização da prévia
  const togglePreview = () => {
    setPreview(!preview);
  };

  // Função para testar o envio de uma mensagem
  const handleTestSend = async (e) => {
    e.preventDefault();
    
    // Validar se há um número para testar
    if (!testPhone || testPhone.trim() === '') {
      setError('Informe um número de telefone para testar o envio');
      return;
    }
    
    try {
      setIsTesting(true);
      
      // Dados para o teste
      let testData = {
        phone: testPhone.trim(),
        message: formData.content
      };
      
      // Processar mídia se houver
      if (formData.mediaType) {
        testData.mediaType = formData.mediaType;
        
        // Se temos um arquivo, converter para base64
        if (file) {
          console.log('Arquivo de mídia para teste, convertendo para base64');
          try {
            // Converter arquivo para base64
            const base64Info = await convertFileToBase64(file);
            
            if (base64Info) {
              // Adicionar dados base64 ao testData
              testData.mediaBase64 = base64Info.base64Data;
              testData.mediaMimeType = base64Info.mimeType;
              
              // Montar um payload específico para Evolution API
              testData.evolutionPayload = {
                number: testPhone.trim(),
                mediatype: formData.mediaType,
                mimetype: base64Info.mimeType,
                media: base64Info.base64Data,
                caption: formData.content || '',
                delay: 1200
              };
              
              console.log('Arquivo para teste convertido para base64 com sucesso');
            }
          } catch (err) {
            console.error('Erro ao converter arquivo para base64 para teste:', err);
            setError('Erro ao processar arquivo de mídia. Tente novamente.');
            setIsTesting(false);
            return;
          }
        } 
        // Se não for arquivo, usar a URL diretamente
        else if (formData.mediaUrl) {
          // Verificar se a URL já é base64
          if (formData.mediaUrl.startsWith('data:')) {
            // Extrair tipo MIME e dados base64
            const matches = formData.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const [, mimeType, base64Content] = matches;
              
              // Adicionar dados base64 ao testData
              testData.mediaBase64 = base64Content;
              testData.mediaMimeType = mimeType;
              
              // Montar um payload específico para Evolution API
              testData.evolutionPayload = {
                number: testPhone.trim(),
                mediatype: formData.mediaType,
                mimetype: mimeType,
                media: base64Content,
                caption: formData.content || '',
                delay: 1200
              };
            }
          } else {
            testData.mediaUrl = formData.mediaUrl;
            
            // Montar um payload específico para Evolution API
            testData.evolutionPayload = {
              number: testPhone.trim(),
              mediatype: formData.mediaType,
              url: formData.mediaUrl,
              caption: formData.content || '',
              delay: 1200
            };
            
            console.log('Usando URL de mídia diretamente para teste:', formData.mediaUrl);
          }
        }
      }
      
      console.log('Enviando teste com dados:', {
        ...testData,
        mediaBase64: testData.mediaBase64 ? '[BASE64 ENCURTADO]' : undefined,
        evolutionPayload: testData.evolutionPayload ? {
          ...testData.evolutionPayload,
          media: testData.evolutionPayload.media ? '[BASE64 ENCURTADO]' : undefined
        } : undefined
      });
      
      // Enviar teste
      const response = await apiService.evolutionApi.testMedia(testData);
      
      if (response.success) {
        setSuccess('Mensagem de teste enviada com sucesso!');
        toast.success('Mensagem de teste enviada com sucesso!');
      } else {
        throw new Error(response.message || 'Erro ao enviar mensagem de teste');
      }
    } catch (error) {
      console.error('Erro ao testar envio:', error);
      setError(`Erro ao enviar mensagem de teste: ${error.message}`);
      toast.error(`Erro ao enviar mensagem de teste: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Função para fechar o snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Função para fazer upload de um arquivo
  const uploadFile = async () => {
    if (!file) {
      setError('Nenhum arquivo selecionado');
      return null;
    }

    try {
      setIsLoading(true);
      console.log('Iniciando conversão do arquivo para base64');
      
      // Converter arquivo para base64
      const base64Info = await convertFileToBase64(file);
      console.log('Arquivo convertido para base64 com sucesso');
      
      // Retornar o resultado com a URL base64
      return {
        url: base64Info.dataUrl,
        base64Data: base64Info.base64Data,
        mimeType: base64Info.mimeType,
        mediaType: base64Info.mediaType,
        success: true
      };
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setError(`Erro ao processar arquivo: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar formulário
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          {isEditMode ? 'Editar Mensagem' : 'Nova Mensagem'}
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
      ) : (
        <Paper sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
          
          <div>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  name="title"
                  label="Título da Mensagem"
                  value={formData.title}
                  onChange={handleChange}
                  fullWidth
                  required
                  disabled={isSaving}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="content"
                  label="Conteúdo da Mensagem"
                  value={formData.content}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  fullWidth
                  required
                  disabled={isSaving}
                />
                <FormHelperText>
                  Use variáveis como {'{nome}'}, {'{telefone}'} que serão substituídas pelos dados do contato
                </FormHelperText>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="media-type-label">Tipo de Mídia (opcional)</InputLabel>
                  <Select
                    labelId="media-type-label"
                    name="mediaType"
                    value={formData.mediaType || ''}
                    onChange={handleMediaTypeChange}
                    label="Tipo de Mídia (opcional)"
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    <MenuItem value="image">Imagem</MenuItem>
                    <MenuItem value="video">Vídeo</MenuItem>
                    <MenuItem value="audio">Áudio</MenuItem>
                    <MenuItem value="document">Documento</MenuItem>
                  </Select>
                  <FormHelperText>
                    Selecione o tipo de mídia que deseja incluir na mensagem
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="mediaUrl"
                  label="URL da Mídia"
                  value={formData.mediaUrl || ''}
                  onChange={handleMediaUrlChange}
                  fullWidth
                  disabled={!formData.mediaType}
                  helperText={
                    !formData.mediaType 
                      ? "Selecione um tipo de mídia primeiro" 
                      : "Cole URL da mídia ou envie um arquivo pelo botão abaixo"
                  }
                />
              </Grid>
              
              <Grid item xs={12}>
                {formData.mediaType && (
                  <Box sx={{ mt: 2 }}>
                    <input
                      type="file"
                      id="media-file-upload"
                      hidden
                      onChange={handleFileChange}
                      accept={
                        formData.mediaType === 'image' ? 'image/*' :
                        formData.mediaType === 'video' ? 'video/*' :
                        formData.mediaType === 'audio' ? 'audio/*' :
                        formData.mediaType === 'document' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt' : ''
                      }
                    />
                    <label htmlFor="media-file-upload">
                      <Button
                        component="span"
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        sx={{ mr: 2 }}
                      >
                        Enviar Arquivo
                      </Button>
                    </label>
                    {file && (
                      <>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Arquivo selecionado: {file.name}
                        </Typography>
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Se o upload não funcionar, você pode usar uma URL externa no campo acima.
                        </Alert>
                      </>
                    )}
                  </Box>
                )}
                {renderMediaPreview()}
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="header"
                  label="Cabeçalho (Opcional)"
                  value={formData.header}
                  onChange={handleChange}
                  fullWidth
                  disabled={isSaving}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="footer"
                  label="Rodapé (Opcional)"
                  value={formData.footer}
                  onChange={handleChange}
                  fullWidth
                  disabled={isSaving}
                />
              </Grid>

              {/* Botão para testar envio */}
              <Box sx={{ mt: 3, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Telefone para teste"
                      placeholder="5511999999999"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      helperText="Informe o número com código do país e DDD"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">+</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleTestSend}
                      startIcon={<SendIcon />}
                      disabled={isTesting}
                      sx={{ height: '56px' }}
                    >
                      {isTesting ? 'Enviando...' : 'Testar Envio'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={togglePreview}
              >
                {preview ? 'Ocultar Prévia' : 'Mostrar Prévia'}
              </Button>
              
              <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                startIcon={<SaveIcon />}
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar Mensagem'}
              </Button>
            </Box>
            
            {preview && (
              <Box sx={{ mt: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Prévia da Mensagem
                </Typography>
                
                {formData.header && (
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {formData.header}
                  </Typography>
                )}
                
                {formData.mediaType && formData.mediaUrl && (
                  <Box sx={{ mb: 2 }}>
                    {formData.mediaType === 'image' && (
                      <img 
                        src={formData.mediaUrl} 
                        alt="Prévia" 
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} 
                      />
                    )}
                    {formData.mediaType === 'video' && (
                      <Box>
                        <Typography variant="body2">[Vídeo]</Typography>
                        <Typography variant="caption">{formData.mediaUrl}</Typography>
                      </Box>
                    )}
                    {(formData.mediaType === 'document' || formData.mediaType === 'audio') && (
                      <Box>
                        <Typography variant="body2">
                          [{formData.mediaType === 'document' ? 'Documento' : 'Áudio'}]
                        </Typography>
                        <Typography variant="caption">{formData.mediaUrl}</Typography>
                      </Box>
                    )}
                  </Box>
                )}
                
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {formData.content}
                </Typography>
                
                {formData.footer && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    {formData.footer}
                  </Typography>
                )}
              </Box>
            )}
          </div>
        </Paper>
      )}
      
      {/* Adicionar o componente Snackbar para exibir notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default MessageForm; 