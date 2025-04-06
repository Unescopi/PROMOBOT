"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { HiOutlinePhotograph, HiOutlineVideoCamera, HiCalendar, HiOutlinePaperClip, HiOutlineUsers, HiDocument, HiCheck, HiExclamation } from 'react-icons/hi';
import MediaUploader from '@/components/MediaUploader';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

// Definir o tipo para tipo de mensagem
type MessageType = 'texto' | 'imagem' | 'video' | 'documento';

export default function NovaCampanha() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'texto' as MessageType, // Definindo o tipo explicitamente
    mensagem: '',
    destino: '',
    dataAgendamento: '',
    horaAgendamento: '',
    agendamento: false,
    frequencia: 'unica',
    grupo: '',
    tags: [] as string[],
    contatos: [] as string[],
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const [contatos, setContatos] = useState<any[]>([]);
  const [loadingContatos, setLoadingContatos] = useState(false);
  
  // Opções de grupos
  const grupos = [
    { id: 'clientes', nome: 'Clientes Ativos' },
    { id: 'vips', nome: 'Clientes VIP' },
    { id: 'inativos', nome: 'Clientes Inativos' },
    { id: 'aniversariantes', nome: 'Aniversariantes do Mês' },
  ];

  // Opções de frequência
  const frequencias = [
    { id: 'unica', nome: 'Envio único' },
    { id: 'diaria', nome: 'Diária' },
    { id: 'semanal', nome: 'Semanal' },
    { id: 'mensal', nome: 'Mensal' },
  ];
  
  // Substituir o mock de dados por dados reais
  useEffect(() => {
    // Buscar contatos do banco de dados
    const fetchContatos = async () => {
      try {
        setLoadingContatos(true);
        const response = await fetch('/api/contatos');
        const responseData = await response.json();
        
        // Verificar se a resposta foi bem-sucedida e se contatos existem na estrutura correta
        if (responseData.success && responseData.data && Array.isArray(responseData.data.contatos)) {
          const contatosData = responseData.data.contatos;
          setContatos(contatosData);
          
          // Extrair tags únicas de todos os contatos
          const tags = new Set<string>();
          contatosData.forEach((contato: any) => {
            if (contato && Array.isArray(contato.tags)) {
              contato.tags.forEach((tag: string) => tags.add(tag));
            }
          });
          
          setAvailableTags(Array.from(tags));
        } else {
          console.error('Erro ao buscar contatos:', responseData.message || 'Formato de resposta inválido');
          setContatos([]);
          setAvailableTags([]);
        }
      } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        setContatos([]);
        setAvailableTags([]);
      } finally {
        setLoadingContatos(false);
      }
    };
    
    fetchContatos();
  }, []);
  
  // Lidar com mudanças nos campos do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Limpar erro quando o usuário começar a digitar
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    
    // Mostrar seletor de contatos se destino for "manual"
    if (name === 'destino' && value === 'manual') {
      setShowContactSelector(true);
    } else if (name === 'destino') {
      setShowContactSelector(false);
    }
    
    // Mostrar seletor de tags se destino for "tags"
    if (name === 'destino' && value === 'tags') {
      setShowTagSelector(true);
    } else if (name === 'destino') {
      setShowTagSelector(false);
    }
  };
  
  // Lidar com seleção de tipo de mensagem
  const handleTipoChange = (tipo: MessageType) => {
    setFormData({ ...formData, tipo });
  };
  
  // Lidar com upload de mídia
  const handleMediaUpload = (file: File, preview: string, url: string) => {
    setMediaFile(file);
    setMediaPreview(preview);
    setMediaUrl(url);
  };
  
  // Remover mídia
  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
    setMediaUrl('');
  };
  
  // Alternar seleção de contato
  const toggleContactSelection = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };
  
  // Alternar seleção de tag
  const toggleTagSelection = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // Verificar se o tipo de mensagem não é texto
  const isMediaType = (tipo: MessageType): boolean => {
    return tipo !== "texto";
  };
  
  // Validar o formulário
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'O nome da campanha é obrigatório';
    }
    
    if (!formData.mensagem.trim()) {
      newErrors.mensagem = 'A mensagem é obrigatória';
    }
    
    if (!formData.destino) {
      newErrors.destino = 'Selecione o destino da campanha';
    } else if (formData.destino === 'grupo' && !formData.grupo) {
      newErrors.grupo = 'Selecione um grupo';
    } else if (formData.destino === 'tags' && selectedTags.length === 0) {
      newErrors.tags = 'Selecione pelo menos uma tag';
    } else if (formData.destino === 'manual' && selectedContacts.length === 0) {
      newErrors.contatos = 'Selecione pelo menos um contato';
    }
    
    if (formData.tipo !== 'texto' && !mediaUrl) {
      newErrors.media = 'Adicione um arquivo de mídia';
    }
    
    // Se tiver agendamento, verificar se data e hora estão preenchidas
    if (formData.dataAgendamento || formData.horaAgendamento) {
      if (!formData.dataAgendamento) {
        newErrors.dataAgendamento = 'Selecione uma data para o agendamento';
      }
      if (!formData.horaAgendamento) {
        newErrors.horaAgendamento = 'Selecione uma hora para o agendamento';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Alternar visualização de preview
  const togglePreview = () => {
    if (!formData.mensagem.trim()) {
      setErrors({ ...errors, mensagem: 'Adicione uma mensagem para visualizar o preview' });
      return;
    }
    setShowPreview(!showPreview);
  };
  
  // Função para lidar com o envio do formulário
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validar formulário antes de enviar
    if (!validateForm()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Preparar lista de destinatários com base no tipo de destino
      let destinatarios: string[] = [];
      
      if (formData.destino === 'todos') {
        // Todos os contatos
        destinatarios = contatos.map(contato => contato.telefone);
      } else if (formData.destino === 'grupo') {
        // Contatos de um grupo específico (em um sistema real, você buscaria isso do banco)
        destinatarios = selectedContacts;
      } else if (formData.destino === 'tags') {
        // Contatos com as tags selecionadas
        destinatarios = contatos
          .filter(contato => 
            Array.isArray(contato.tags) && 
            selectedTags.some(tag => contato.tags.includes(tag))
          )
          .map(contato => contato.telefone);
      } else if (formData.destino === 'manual') {
        // Contatos selecionados manualmente
        destinatarios = selectedContacts;
      }
      
      // Preparar dados para envio
      const formPayload: any = {
        nome: formData.nome,
        mensagem: formData.mensagem,
        tipo: formData.tipo,
        status: 'running', // Diretamente para execução
        destinatarios: destinatarios,
      };
      
      // Adicionar dados de agendamento se preenchidos
      if (formData.dataAgendamento && formData.horaAgendamento) {
        formPayload.agendamento = `${formData.dataAgendamento}T${formData.horaAgendamento}:00Z`;
        formPayload.status = 'scheduled'; // Se tiver agendamento, é uma campanha agendada
      }
      
      // Adicionar atributos de mídia dependendo do tipo
      if (formData.tipo !== 'texto') {
        formPayload.mediaUrl = mediaUrl;
        formPayload.mediaType = formData.tipo;
      }
      
      // Enviar para a API
      const response = await fetch('/api/campanhas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formPayload),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha criada com sucesso!');
        
        // Redirecionar para a página de detalhes da campanha após 1 segundo
        setTimeout(() => {
          router.push(`/campanhas/${data.campanha._id}`);
        }, 1000);
      } else {
        throw new Error(data.message || 'Erro ao criar campanha');
      }
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar campanha');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Modificar o método para salvar como rascunho
  const handleSaveAsDraft = async () => {
    try {
      // Verificar o nome no mínimo
      if (!formData.nome.trim()) {
        setErrors({ nome: 'O nome da campanha é obrigatório' });
        toast.error('Preencha o nome da campanha');
        return;
      }
      
      setIsSubmitting(true);
      
      // Preparar lista de destinatários com base no tipo de destino
      let destinatarios: string[] = [];
      
      if (formData.destino === 'todos') {
        destinatarios = contatos.map(contato => contato.telefone);
      } else if (formData.destino === 'grupo') {
        destinatarios = selectedContacts;
      } else if (formData.destino === 'tags') {
        destinatarios = contatos
          .filter(contato => 
            Array.isArray(contato.tags) && 
            selectedTags.some(tag => contato.tags.includes(tag))
          )
          .map(contato => contato.telefone);
      } else if (formData.destino === 'manual') {
        destinatarios = selectedContacts;
      }
      
      // Preparar dados para envio
      const formPayload: any = {
        nome: formData.nome,
        mensagem: formData.mensagem || '',
        tipo: formData.tipo,
        status: 'draft',
        destinatarios: destinatarios,
      };
      
      // Adicionar atributos de mídia
      if (mediaFile && mediaUrl) {
        formPayload.mediaUrl = mediaUrl;
        formPayload.mediaType = formData.tipo;
      }
      
      // Adicionar informações de agendamento se disponíveis
      if (formData.dataAgendamento && formData.horaAgendamento) {
        formPayload.agendamento = `${formData.dataAgendamento}T${formData.horaAgendamento}:00Z`;
      }
      
      // Enviar para API
      const response = await fetch('/api/campanhas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formPayload),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Mostrar notificação de sucesso
        toast.success('Campanha salva como rascunho com sucesso!');
        
        // Redirecionar para a lista de rascunhos após um breve delay
        setTimeout(() => {
          router.push('/campanhas/rascunhos');
        }, 1000);
      } else {
        throw new Error(data.message || 'Erro ao salvar rascunho');
      }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar rascunho');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Renderizar o preview da mensagem
  const renderMessagePreview = () => {
    let previewMessage = formData.mensagem;
    
    // Substituir variáveis na mensagem
    previewMessage = previewMessage.replace(/\{nome\}/g, 'João Silva');
    
    return (
      <div className="p-4 bg-gray-100 rounded-lg w-full max-w-sm mx-auto">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Prévia da mensagem:</div>
          <div className="p-2 bg-green-50 rounded-lg text-gray-800 whitespace-pre-wrap mb-2">
            {previewMessage}
          </div>
          
          {mediaPreview && (
            <div className="mt-2">
              {mediaFile?.type.startsWith('image/') ? (
                <img src={mediaPreview} alt="Preview" className="w-full h-40 object-contain rounded-md" />
              ) : (
                <div className="bg-gray-100 p-2 rounded-md flex items-center">
                  <HiDocument className="text-blue-500 mr-2" />
                  <span className="text-sm text-gray-700">{mediaFile?.name}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-2 text-right">
            Enviado para {formData.destino === 'todos' 
              ? 'todos os contatos' 
              : formData.destino === 'grupo' 
                ? 'grupo ' + grupos.find(g => g.id === formData.grupo)?.nome.toLowerCase()
                : formData.destino === 'tags'
                  ? 'contatos com as tags: ' + selectedTags.join(', ')
                  : selectedContacts.length + ' contatos selecionados'
            }
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <DashboardLayout pageTitle="Nova Campanha">
      <div className="max-w-4xl" ref={formRef}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Campanha*
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className={`w-full px-4 py-2 border ${errors.nome ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Ex: Promoção Café da Manhã"
              />
              {errors.nome && (
                <p className="mt-1 text-xs text-red-500">{errors.nome}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Mensagem*
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div 
                  className={`border ${formData.tipo === 'texto' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer flex flex-col items-center text-center`}
                  onClick={() => handleTipoChange('texto')}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <HiOutlinePaperClip className="text-blue-600 text-xl" />
                  </div>
                  <span className="font-medium">Texto</span>
                  <p className="text-xs text-gray-500 mt-1">Apenas mensagem de texto</p>
                </div>
                
                <div 
                  className={`border ${formData.tipo === 'imagem' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer flex flex-col items-center text-center`}
                  onClick={() => handleTipoChange('imagem')}
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <HiOutlinePhotograph className="text-green-600 text-xl" />
                  </div>
                  <span className="font-medium">Imagem</span>
                  <p className="text-xs text-gray-500 mt-1">Texto com imagem</p>
                </div>
                
                <div 
                  className={`border ${formData.tipo === 'video' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer flex flex-col items-center text-center`}
                  onClick={() => handleTipoChange('video')}
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                    <HiOutlineVideoCamera className="text-purple-600 text-xl" />
                  </div>
                  <span className="font-medium">Vídeo</span>
                  <p className="text-xs text-gray-500 mt-1">Texto com vídeo</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="mensagem" className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem*
              </label>
              <textarea
                id="mensagem"
                name="mensagem"
                value={formData.mensagem}
                onChange={handleChange}
                rows={5}
                className={`w-full px-4 py-2 border ${errors.mensagem ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Digite sua mensagem promocional aqui..."
              ></textarea>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Dica: Use {'{nome}'} para personalizar a mensagem com o nome do cliente.
                </p>
                <button
                  type="button"
                  onClick={togglePreview}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
                </button>
              </div>
              {errors.mensagem && (
                <p className="mt-1 text-xs text-red-500">{errors.mensagem}</p>
              )}
            </div>
            
            {showPreview && (
              <div className="mb-6 flex justify-center">
                {renderMessagePreview()}
              </div>
            )}

            {(formData.tipo === 'imagem' || formData.tipo === 'video' || formData.tipo === 'documento') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Mídia *
                </label>
                <MediaUploader
                  onUpload={handleMediaUpload}
                  onRemove={handleRemoveMedia}
                  mediaType={formData.tipo === 'imagem' ? 'image' : formData.tipo === 'video' ? 'video' : 'document'}
                  accept={formData.tipo === 'imagem' ? 'image/*' : formData.tipo === 'video' ? 'video/*' : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'}
                  maxSize={10}
                />
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="destino" className="block text-sm font-medium text-gray-700 mb-1">
                Destino*
              </label>
              <div className="flex items-center">
                <HiOutlineUsers className="text-gray-400 mr-2" />
                <select 
                  id="destino" 
                  name="destino"
                  value={formData.destino}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border ${errors.destino ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Selecione o destino</option>
                  <option value="todos">Todos os contatos</option>
                  <option value="grupo">Grupo específico</option>
                  <option value="tags">Por tags</option>
                  <option value="manual">Seleção manual</option>
                </select>
              </div>
              {errors.destino && (
                <p className="mt-1 text-xs text-red-500">{errors.destino}</p>
              )}
            </div>
            
            {formData.destino === 'grupo' && (
              <div className="mb-6 ml-6">
                <label htmlFor="grupo" className="block text-sm font-medium text-gray-700 mb-1">
                  Selecione um grupo*
                </label>
                <select 
                  id="grupo" 
                  name="grupo"
                  value={formData.grupo}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border ${errors.grupo ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Selecione um grupo</option>
                  {grupos.map(grupo => (
                    <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
                  ))}
                </select>
                {errors.grupo && (
                  <p className="mt-1 text-xs text-red-500">{errors.grupo}</p>
                )}
              </div>
            )}
            
            {showTagSelector && (
              <div className="mb-6 ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione as tags*
                </label>
                {loadingContatos ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : availableTags.length === 0 ? (
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <p className="text-gray-500">Nenhuma tag encontrada</p>
                  </div>
                ) : (
                  <div className={`flex flex-wrap gap-2 p-3 border ${errors.tags ? 'border-red-500' : 'border-gray-300'} rounded-lg`}>
                    {availableTags.map(tag => (
                      <div
                        key={tag}
                        onClick={() => toggleTagSelection(tag)}
                        className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {selectedTags.includes(tag) && <HiCheck className="inline mr-1" />}
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
                {errors.tags && (
                  <p className="mt-1 text-xs text-red-500">{errors.tags}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Contatos encontrados: {contatos.filter(c => 
                    Array.isArray(c.tags) && selectedTags.some(tag => c.tags.includes(tag))
                  ).length}
                </p>
              </div>
            )}
            
            {showContactSelector && (
              <div className="mb-6 ml-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione os contatos*
                </label>
                {loadingContatos ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : contatos.length === 0 ? (
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <p className="text-gray-500">Nenhum contato encontrado</p>
                    <button
                      type="button"
                      onClick={() => router.push('/contatos/novo')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Adicionar contato
                    </button>
                  </div>
                ) : (
                  <div className={`max-h-60 overflow-y-auto border ${errors.contatos ? 'border-red-500' : 'border-gray-300'} rounded-lg p-2`}>
                    {contatos.map(contact => (
                      <div
                        key={contact._id}
                        className={`p-2 mb-1 rounded flex items-center cursor-pointer ${
                          selectedContacts.includes(contact.telefone) ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleContactSelection(contact.telefone)}
                      >
                        <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                          selectedContacts.includes(contact.telefone) ? 'bg-blue-600' : 'border border-gray-300'
                        }`}>
                          {selectedContacts.includes(contact.telefone) && (
                            <HiCheck className="text-white text-xs" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{contact.nome}</div>
                          <div className="text-xs text-gray-500">{contact.telefone}</div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(contact.tags) && contact.tags.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {errors.contatos && (
                  <p className="mt-1 text-xs text-red-500">{errors.contatos}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {selectedContacts.length} contato(s) selecionado(s)
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="dataAgendamento" className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Agendamento*
                </label>
                <div className="flex items-center">
                  <HiCalendar className="text-gray-400 mr-2" />
                  <input
                    type="date"
                    id="dataAgendamento"
                    name="dataAgendamento"
                    value={formData.dataAgendamento}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border ${errors.dataAgendamento ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
                {errors.dataAgendamento && (
                  <p className="mt-1 text-xs text-red-500">{errors.dataAgendamento}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="horaAgendamento" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora do Agendamento*
                </label>
                <div className="flex items-center">
                  <HiCalendar className="text-gray-400 mr-2" />
                  <input
                    type="time"
                    id="horaAgendamento"
                    name="horaAgendamento"
                    value={formData.horaAgendamento}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border ${errors.horaAgendamento ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
                {errors.horaAgendamento && (
                  <p className="mt-1 text-xs text-red-500">{errors.horaAgendamento}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="frequencia" className="block text-sm font-medium text-gray-700 mb-1">
                  Frequência
                </label>
                <div className="flex items-center">
                  <HiCalendar className="text-gray-400 mr-2" />
                  <select 
                    id="frequencia" 
                    name="frequencia"
                    value={formData.frequencia}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {frequencias.map(freq => (
                      <option key={freq.id} value={freq.id}>{freq.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {formData.frequencia !== 'unica' && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                <HiExclamation className="text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  Campanhas recorrentes serão enviadas na frequência selecionada a partir da data de agendamento.
                  Para campanhas semanais e mensais, o envio será no mesmo dia da semana ou mesmo dia do mês da data inicial.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <div>
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  Salvar rascunho
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/campanhas')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancelar
                </button>
              </div>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                Salvar e Enviar
              </button>
            </div>
          </form>
        </div>
      </div>
      <Toaster position="top-right" />
    </DashboardLayout>
  );
} 