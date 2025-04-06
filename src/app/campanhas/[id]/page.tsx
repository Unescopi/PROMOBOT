"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { toast, Toaster } from 'react-hot-toast';
import { 
  HiArrowLeft, 
  HiPencil, 
  HiPause, 
  HiPlay, 
  HiStop, 
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineLink,
  HiOutlineStatusOnline
} from 'react-icons/hi';
import Link from 'next/link';

// Interface para campanha
interface Campanha {
  _id: string;
  nome: string;
  mensagem: string;
  tipo: 'texto' | 'imagem' | 'video' | 'documento';
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

export default function DetalhesCampanha() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Buscar dados da campanha
  useEffect(() => {
    const fetchCampanha = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/campanhas/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setCampanha(data.data);
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
      
      // Atualizar a cada 30 segundos se estiver em execução
      const interval = setInterval(() => {
        if (campanha && (campanha.status === 'running' || campanha.status === 'paused')) {
          fetchCampanha();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [id, campanha?.status]);
  
  // Formatar data
  const formatarData = (dataString?: string) => {
    if (!dataString) return 'N/A';
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Pausar campanha
  const handlePause = async () => {
    if (!campanha || campanha.status !== 'running') return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'pause',
          id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha pausada com sucesso!');
        setCampanha(prev => prev ? { ...prev, status: 'paused' } : null);
      } else {
        toast.error(data.message || 'Erro ao pausar campanha');
      }
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
      toast.error('Falha ao pausar campanha. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Retomar campanha
  const handleResume = async () => {
    if (!campanha || campanha.status !== 'paused') return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'resume',
          id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha retomada com sucesso!');
        setCampanha(prev => prev ? { ...prev, status: 'running' } : null);
      } else {
        toast.error(data.message || 'Erro ao retomar campanha');
      }
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
      toast.error('Falha ao retomar campanha. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Cancelar campanha
  const handleCancel = async () => {
    if (!campanha || ['completed', 'cancelled'].includes(campanha.status)) return;
    
    // Confirmar antes de cancelar
    if (!confirm('Tem certeza que deseja cancelar esta campanha? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'cancel',
          id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha cancelada com sucesso!');
        setCampanha(prev => prev ? { ...prev, status: 'cancelled' } : null);
      } else {
        toast.error(data.message || 'Erro ao cancelar campanha');
      }
    } catch (error) {
      console.error('Erro ao cancelar campanha:', error);
      toast.error('Falha ao cancelar campanha. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Renderizar ícone com base no tipo de mensagem
  const renderTipoIcon = () => {
    switch(campanha?.tipo) {
      case 'imagem':
        return (
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'video':
        return (
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'documento':
        return (
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
        );
    }
  };
  
  return (
    <DashboardLayout pageTitle="Detalhes da Campanha">
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Link 
              href="/campanhas"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <HiArrowLeft className="mr-2" />
              Voltar
            </Link>
            <h1 className="text-2xl font-semibold text-gray-800">
              {loading ? 'Carregando...' : campanha?.nome || 'Campanha não encontrada'}
            </h1>
          </div>
          
          <div className="flex space-x-2">
            {campanha && campanha.status === 'draft' && (
              <Link 
                href={`/campanhas/editar/${id}`}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <HiPencil className="mr-2" />
                Editar
              </Link>
            )}
            
            {campanha && campanha.status === 'running' && (
              <button
                onClick={handlePause}
                disabled={actionLoading}
                className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                <HiPause className="mr-2" />
                Pausar
              </button>
            )}
            
            {campanha && campanha.status === 'paused' && (
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <HiPlay className="mr-2" />
                Retomar
              </button>
            )}
            
            {campanha && ['running', 'paused', 'scheduled'].includes(campanha.status) && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <HiStop className="mr-2" />
                Cancelar
              </button>
            )}
          </div>
        </div>
        
        {error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
            <HiOutlineExclamationCircle className="inline-block mr-2 h-5 w-5" />
            {error}
          </div>
        ) : loading ? (
          <div className="animate-pulse space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : !campanha ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <HiOutlineExclamationCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Campanha não encontrada</h2>
            <p className="text-gray-600 mb-4">A campanha que você está procurando pode ter sido removida ou nunca existiu.</p>
            <Link 
              href="/campanhas"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
            >
              Voltar para Campanhas
            </Link>
          </div>
        ) : (
          <>
            {/* Cabeçalho e status */}
            <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {renderTipoIcon()}
                    <div className="ml-4">
                      <h2 className="text-xl font-semibold text-gray-800">{campanha.nome}</h2>
                      <p className="text-gray-500 flex items-center mt-1">
                        <HiOutlineStatusOnline className="mr-1" />
                        Status: 
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                          campanha.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          campanha.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                          campanha.status === 'running' ? 'bg-green-100 text-green-700' :
                          campanha.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                          campanha.status === 'completed' ? 'bg-blue-100 text-blue-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {campanha.status === 'draft' ? 'Rascunho' :
                           campanha.status === 'scheduled' ? 'Agendada' :
                           campanha.status === 'running' ? 'Em Execução' :
                           campanha.status === 'paused' ? 'Pausada' :
                           campanha.status === 'completed' ? 'Concluída' : 'Cancelada'}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center justify-end">
                      <HiOutlineClock className="mr-1" />
                      Criada em {formatarData(campanha.criadoEm)}
                    </div>
                    <div className="flex items-center justify-end mt-1">
                      <HiOutlineClock className="mr-1" />
                      Atualizada em {formatarData(campanha.atualizadoEm)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <HiOutlineDocumentText className="mr-2" />
                      Mensagem
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-gray-800 whitespace-pre-wrap">{campanha.mensagem}</p>
                    </div>
                    
                    {campanha.mediaUrl && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <HiOutlineLink className="mr-2" />
                          Mídia
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          {campanha.tipo === 'imagem' ? (
                            <div>
                              <img 
                                src={campanha.mediaUrl} 
                                alt="Imagem da campanha" 
                                className="max-w-full h-auto max-h-64 rounded-md"
                              />
                              <a 
                                href={campanha.mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                              >
                                Abrir imagem em tamanho original
                              </a>
                            </div>
                          ) : (
                            <a 
                              href={campanha.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {campanha.tipo === 'video' ? 'Visualizar vídeo' : 'Visualizar documento'}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <HiOutlineUserGroup className="mr-2" />
                        Destinatários
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-gray-800">Total: {campanha.destinatarios.length} contatos</p>
                      </div>
                    </div>
                    
                    {campanha.agendamento && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <HiOutlineCalendar className="mr-2" />
                          Agendamento
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-gray-800">{formatarData(campanha.agendamento)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Estatísticas */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Estatísticas da Campanha</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-4 rounded-md text-center">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold">{campanha.estatisticas.total}</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md text-center">
                  <p className="text-sm text-blue-500">Enviadas</p>
                  <p className="text-2xl font-bold">{campanha.estatisticas.enviadas}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round((campanha.estatisticas.enviadas / campanha.estatisticas.total) * 100)}% do total
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-md text-center">
                  <p className="text-sm text-green-500">Entregues</p>
                  <p className="text-2xl font-bold">{campanha.estatisticas.entregues}</p>
                  <p className="text-xs text-gray-500">
                    {campanha.estatisticas.enviadas ? 
                      `${Math.round((campanha.estatisticas.entregues / campanha.estatisticas.enviadas) * 100)}% dos envios` : 
                      '0% dos envios'}
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-md text-center">
                  <p className="text-sm text-yellow-500">Lidas</p>
                  <p className="text-2xl font-bold">{campanha.estatisticas.lidas}</p>
                  <p className="text-xs text-gray-500">
                    {campanha.estatisticas.entregues ? 
                      `${Math.round((campanha.estatisticas.lidas / campanha.estatisticas.entregues) * 100)}% das entregas` : 
                      '0% das entregas'}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-md text-center">
                  <p className="text-sm text-purple-500">Respondidas</p>
                  <p className="text-2xl font-bold">{campanha.estatisticas.respondidas}</p>
                  <p className="text-xs text-gray-500">
                    {campanha.estatisticas.lidas ? 
                      `${Math.round((campanha.estatisticas.respondidas / campanha.estatisticas.lidas) * 100)}% das lidas` : 
                      '0% das lidas'}
                  </p>
                </div>
              </div>
              
              {/* Progresso da campanha */}
              {['running', 'paused', 'completed'].includes(campanha.status) && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Progresso da Campanha</h3>
                    <span className="text-sm text-gray-500">
                      {Math.round((campanha.estatisticas.enviadas / campanha.estatisticas.total) * 100)}% completo
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        campanha.status === 'paused' ? 'bg-yellow-500' : 
                        campanha.status === 'completed' ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.round((campanha.estatisticas.enviadas / campanha.estatisticas.total) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 