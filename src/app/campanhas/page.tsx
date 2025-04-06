"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  HiOutlinePlus, 
  HiOutlineSearch, 
  HiOutlineFilter,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineUsers
} from 'react-icons/hi';
import Link from 'next/link';
import { Toaster, toast } from 'react-hot-toast';

// Tipo para os dados de paginação 
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Tipo para uma campanha
interface Campanha {
  _id: string;
  nome: string;
  mensagem: string;
  tipo: 'texto' | 'imagem' | 'video' | 'documento';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  destinatarios: string[];
  agendamento?: string;
  estatisticas: {
    total: number;
    enviadas: number;
    entregues: number;
    lidas: number;
    respondidas: number;
    falhas: number;
  };
  criadoEm: string;
}

export default function Campanhas() {
  const router = useRouter();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Status com tradução para português
  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    scheduled: 'Agendada', 
    running: 'Em Execução',
    paused: 'Pausada',
    completed: 'Concluída',
    cancelled: 'Cancelada'
  };

  // Classes de cores para cada status
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-yellow-100 text-yellow-700',
    running: 'bg-green-100 text-green-700',
    paused: 'bg-orange-100 text-orange-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  // Buscar campanhas
  const fetchCampanhas = async (page = 1, status = 'all', search = '') => {
    try {
      setLoading(true);
      
      // Construir URL com parâmetros
      let url = `/api/campanhas?page=${page}&limit=10`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCampanhas(data.campanhas);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        });
      } else {
        setError(data.message || 'Erro ao buscar campanhas');
        setCampanhas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      setError('Não foi possível carregar as campanhas');
      setCampanhas([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar campanhas quando o componente montar
  useEffect(() => {
    fetchCampanhas(pagination.page, statusFilter, searchTerm);
  }, [pagination.page, statusFilter]);

  // Buscar ao pressionar enter no campo de busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCampanhas(1, statusFilter, searchTerm);
  };

  // Mudar página na paginação
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchCampanhas(newPage, statusFilter, searchTerm);
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Pausar campanha
  const handlePauseCampanha = async (id: string) => {
    try {
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
        toast.success('Campanha pausada com sucesso');
        fetchCampanhas(pagination.page, statusFilter, searchTerm);
      } else {
        toast.error(data.message || 'Erro ao pausar campanha');
      }
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
      toast.error('Falha ao pausar campanha');
    }
  };

  // Retomar campanha
  const handleResumeCampanha = async (id: string) => {
    try {
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
        toast.success('Campanha retomada com sucesso');
        fetchCampanhas(pagination.page, statusFilter, searchTerm);
      } else {
        toast.error(data.message || 'Erro ao retomar campanha');
      }
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
      toast.error('Falha ao retomar campanha');
    }
  };

  // Excluir campanha
  const handleDeleteCampanha = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Campanha excluída com sucesso');
        fetchCampanhas(pagination.page, statusFilter, searchTerm);
      } else {
        toast.error(data.message || 'Erro ao excluir campanha');
      }
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      toast.error('Falha ao excluir campanha');
    }
  };

  return (
    <DashboardLayout pageTitle="Campanhas">
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Campanhas</h1>
        <Link
          href="/campanhas/nova"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <HiOutlinePlus className="mr-2" />
          Nova Campanha
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <form onSubmit={handleSearch} className="flex w-full md:w-1/2">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <HiOutlineSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2.5 bottom-2.5 text-blue-600 hover:text-blue-800"
                >
                  Buscar
                </button>
              </div>
            </form>
            
            <div className="flex items-center w-full md:w-auto">
              <HiOutlineFilter className="text-gray-400 mr-2" />
              <select
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="draft">Rascunhos</option>
                <option value="scheduled">Agendadas</option>
                <option value="running">Em execução</option>
                <option value="paused">Pausadas</option>
                <option value="completed">Concluídas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </div>
        
        {error ? (
          <div className="p-4 text-center text-red-500">
            {error}
          </div>
        ) : loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : campanhas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Nenhuma campanha encontrada</p>
            <Link
              href="/campanhas/nova"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <HiOutlinePlus className="mr-2" />
              Criar nova campanha
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alcance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campanhas.map((campanha) => (
                    <tr key={campanha._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{campanha.nome}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{campanha.mensagem}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[campanha.status]}`}>
                          {statusLabels[campanha.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campanha.tipo.charAt(0).toUpperCase() + campanha.tipo.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campanha.destinatarios.length} contatos
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(campanha.criadoEm)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/campanhas/${campanha._id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Ver detalhes"
                          >
                            <HiOutlineEye className="h-5 w-5" />
                          </Link>
                          
                          {campanha.status === 'draft' && (
                            <Link
                              href={`/campanhas/editar/${campanha._id}`}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar campanha"
                            >
                              <HiOutlinePencil className="h-5 w-5" />
                            </Link>
                          )}
                          
                          {campanha.status === 'running' && (
                            <button
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Pausar campanha"
                              onClick={() => handlePauseCampanha(campanha._id)}
                            >
                              <HiOutlinePause className="h-5 w-5" />
                            </button>
                          )}
                          
                          {campanha.status === 'paused' && (
                            <button
                              className="text-green-600 hover:text-green-900"
                              title="Retomar campanha"
                              onClick={() => handleResumeCampanha(campanha._id)}
                            >
                              <HiOutlinePlay className="h-5 w-5" />
                            </button>
                          )}
                          
                          <button
                            className="text-red-600 hover:text-red-900"
                            title="Excluir campanha"
                            onClick={() => handleDeleteCampanha(campanha._id)}
                          >
                            <HiOutlineTrash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex-1 flex justify-between sm:justify-end">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                      pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Anterior
                  </button>
                  <span className="mx-4 text-sm text-gray-700">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                      pagination.page === pagination.totalPages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Links rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/campanhas/nova"
          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full mr-4">
            <HiOutlinePlus className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Nova Campanha</h3>
            <p className="text-sm text-gray-500">Crie uma nova campanha de mensagens</p>
          </div>
        </Link>
        
        <Link
          href="/campanhas/rascunhos"
          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center"
        >
          <div className="p-3 bg-gray-100 text-gray-600 rounded-full mr-4">
            <HiOutlinePencil className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Rascunhos</h3>
            <p className="text-sm text-gray-500">Ver campanhas salvas como rascunho</p>
          </div>
        </Link>
        
        <Link
          href="/contatos"
          className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center"
        >
          <div className="p-3 bg-green-100 text-green-600 rounded-full mr-4">
            <HiOutlineUsers className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800">Contatos</h3>
            <p className="text-sm text-gray-500">Gerenciar contatos e grupos</p>
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
} 