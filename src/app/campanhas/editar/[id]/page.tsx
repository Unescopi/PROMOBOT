"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { toast, Toaster } from 'react-hot-toast';
import { HiOutlinePhotograph, HiOutlineVideoCamera, HiCalendar, HiOutlinePaperClip, HiOutlineUsers, HiDocument, HiCheck, HiExclamation } from 'react-icons/hi';
import Link from 'next/link';

// Definir o tipo para tipo de mensagem
type MessageType = 'texto' | 'imagem' | 'video' | 'documento';

// Interface para campanha
interface Campanha {
  _id: string;
  nome: string;
  mensagem: string;
  tipo: MessageType;
  agendamento?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  destinatarios: string[];
  mediaUrl?: string;
  mediaType?: string;
  estatisticas: {
    total: number;
    enviadas: number;
    entregues: number;
    lidas: number;
    respondidas: number;
    falhas: number;
  };
  criadoEm: string;
  atualizadoEm: string;
}

export default function EditarCampanha() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    mensagem: '',
    tipo: 'texto' as MessageType,
    status: 'draft',
    agendamento: '',
    destinatarios: [] as string[],
    mediaUrl: '',
    mediaType: ''
  });
  
  // Buscar dados da campanha
  useEffect(() => {
    const fetchCampanha = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/campanhas/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setCampanha(data.data);
          
          // Preencher o formulário com os dados existentes
          setFormData({
            nome: data.data.nome,
            mensagem: data.data.mensagem,
            tipo: data.data.tipo,
            status: data.data.status,
            agendamento: data.data.agendamento 
              ? new Date(data.data.agendamento).toISOString().substring(0, 16)
              : '',
            destinatarios: data.data.destinatarios || [],
            mediaUrl: data.data.mediaUrl || '',
            mediaType: data.data.mediaType || ''
          });
        } else {
          setError(data.message || 'Erro ao buscar dados da campanha');
        }
      } catch (error) {
        console.error('Erro ao buscar campanha:', error);
        setError('Não foi possível carregar os dados da campanha. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchCampanha();
    }
  }, [id]);
  
  // Lidar com mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Atualizar campanha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Preparar dados para envio
      const updateData = {
        id,
        nome: formData.nome,
        mensagem: formData.mensagem,
        tipo: formData.tipo,
        agendamento: formData.agendamento ? new Date(formData.agendamento).toISOString() : null,
        mediaUrl: formData.mediaUrl,
        mediaType: formData.mediaType,
      };
      
      // Enviar para a API
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha atualizada com sucesso!');
        // Atualizar dados locais
        setCampanha(data.campanha);
      } else {
        toast.error(data.message || 'Erro ao atualizar campanha');
      }
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      toast.error('Falha ao atualizar campanha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };
  
  // Lançar campanha (mudar status para running)
  const handleLaunch = async () => {
    try {
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'running',
          id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha iniciada com sucesso!');
        // Atualizar dados locais
        setCampanha(data.campanha);
        setFormData({
          ...formData,
          status: 'running'
        });
        
        // Redirecionar para a página principal após 2 segundos
        setTimeout(() => {
          router.push('/campanhas');
        }, 2000);
      } else {
        toast.error(data.message || 'Erro ao iniciar campanha');
      }
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      toast.error('Falha ao iniciar campanha. Tente novamente.');
    }
  };
  
  // Agendar campanha
  const handleSchedule = async () => {
    // Verificar se há data de agendamento
    if (!formData.agendamento) {
      toast.error('Selecione uma data para agendar a campanha');
      return;
    }
    
    try {
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'scheduled',
          agendamento: new Date(formData.agendamento).toISOString(),
          id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha agendada com sucesso!');
        // Atualizar dados locais
        setCampanha(data.campanha);
        setFormData({
          ...formData,
          status: 'scheduled'
        });
        
        // Redirecionar para a página principal após 2 segundos
        setTimeout(() => {
          router.push('/campanhas');
        }, 2000);
      } else {
        toast.error(data.message || 'Erro ao agendar campanha');
      }
    } catch (error) {
      console.error('Erro ao agendar campanha:', error);
      toast.error('Falha ao agendar campanha. Tente novamente.');
    }
  };
  
  // Verificar se o formulário foi alterado
  const formChanged = (): boolean => {
    if (!campanha) return false;
    
    return (
      formData.nome !== campanha.nome ||
      formData.mensagem !== campanha.mensagem ||
      formData.tipo !== campanha.tipo ||
      (formData.agendamento && campanha.agendamento && 
       new Date(formData.agendamento).toISOString() !== new Date(campanha.agendamento).toISOString()) ||
      formData.mediaUrl !== (campanha.mediaUrl || '') ||
      formData.mediaType !== (campanha.mediaType || '')
    );
  };
  
  return (
    <DashboardLayout pageTitle="Editar Campanha">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {loading ? 'Carregando...' : `Editar Campanha`}
            </h1>
            {campanha && (
              <p className="text-gray-500 text-sm">
                {`Status atual: `}
                <span className={`font-medium ${
                  campanha.status === 'draft' ? 'text-gray-600' :
                  campanha.status === 'scheduled' ? 'text-yellow-600' :
                  campanha.status === 'running' ? 'text-green-600' :
                  campanha.status === 'paused' ? 'text-orange-600' :
                  campanha.status === 'completed' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {campanha.status === 'draft' ? 'Rascunho' :
                   campanha.status === 'scheduled' ? 'Agendada' :
                   campanha.status === 'running' ? 'Em Execução' :
                   campanha.status === 'paused' ? 'Pausada' :
                   campanha.status === 'completed' ? 'Concluída' : 'Cancelada'}
                </span>
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <Link 
              href="/campanhas"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Voltar
            </Link>
            {campanha && campanha.status === 'draft' && (
              <>
                <button
                  onClick={handleSchedule}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  disabled={saving}
                >
                  Agendar
                </button>
                <button
                  onClick={handleLaunch}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={saving}
                >
                  Iniciar Campanha
                </button>
              </>
            )}
          </div>
        </div>
        
        {error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
            <HiExclamation className="inline-block mr-2 h-5 w-5" />
            {error}
          </div>
        ) : loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome da campanha"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Mensagem
                </label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="texto">Apenas Texto</option>
                  <option value="imagem">Texto + Imagem</option>
                  <option value="video">Texto + Vídeo</option>
                  <option value="documento">Texto + Documento</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="mensagem" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem
                </label>
                <textarea
                  id="mensagem"
                  name="mensagem"
                  value={formData.mensagem}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite a mensagem que será enviada"
                  required
                ></textarea>
              </div>
              
              {(formData.tipo !== 'texto') && (
                <div>
                  <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    URL da Mídia ({formData.tipo === 'imagem' ? 'Imagem' : 
                                  formData.tipo === 'video' ? 'Vídeo' : 'Documento'})
                  </label>
                  <input
                    type="url"
                    id="mediaUrl"
                    name="mediaUrl"
                    value={formData.mediaUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://exemplo.com/arquivo.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Informe a URL onde o arquivo está hospedado
                  </p>
                </div>
              )}
              
              {campanha && campanha.status === 'draft' && (
                <div>
                  <label htmlFor="agendamento" className="block text-sm font-medium text-gray-700 mb-1">
                    Agendamento (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    id="agendamento"
                    name="agendamento"
                    value={formData.agendamento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Deixe em branco para iniciar imediatamente
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Destinatários</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-600">
                    Esta campanha será enviada para {campanha?.destinatarios?.length || 0} contatos.
                  </p>
                  {campanha?.status === 'draft' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Para mudar os destinatários, você precisa criar uma nova campanha.
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <Link
                href="/campanhas"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center ${
                  saving ? 'opacity-70 cursor-not-allowed' : ''
                } ${!formChanged() ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={saving || !formChanged()}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
                {!saving && formChanged() && <HiCheck className="ml-2" />}
              </button>
            </div>
          </form>
        )}
        
        {/* Estatísticas da campanha */}
        {campanha && ['running', 'paused', 'completed'].includes(campanha.status) && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Estatísticas da Campanha</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold">{campanha.estatisticas.total}</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-500">Enviadas</p>
                <p className="text-xl font-bold">{campanha.estatisticas.enviadas}</p>
                <p className="text-xs text-gray-500">
                  {Math.round((campanha.estatisticas.enviadas / campanha.estatisticas.total) * 100)}% do total
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-500">Entregues</p>
                <p className="text-xl font-bold">{campanha.estatisticas.entregues}</p>
                <p className="text-xs text-gray-500">
                  {Math.round((campanha.estatisticas.entregues / campanha.estatisticas.enviadas || 0) * 100)}% dos envios
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-sm text-yellow-500">Lidas</p>
                <p className="text-xl font-bold">{campanha.estatisticas.lidas}</p>
                <p className="text-xs text-gray-500">
                  {Math.round((campanha.estatisticas.lidas / campanha.estatisticas.entregues || 0) * 100)}% das entregas
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-md">
                <p className="text-sm text-purple-500">Respondidas</p>
                <p className="text-xl font-bold">{campanha.estatisticas.respondidas}</p>
                <p className="text-xs text-gray-500">
                  {Math.round((campanha.estatisticas.respondidas / campanha.estatisticas.lidas || 0) * 100)}% das lidas
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 