"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HiPlus, HiSearch, HiDotsVertical, HiDownload, HiUpload, HiTrash, HiPencil, HiUserAdd } from 'react-icons/hi';
import Link from 'next/link';

interface Contato {
  _id: string;
  nome: string;
  telefone: string;
  email?: string;
  grupos?: string[];
  tags?: string[];
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
}

interface ContatosResponse {
  success: boolean;
  data: {
    contatos: Contato[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    tags: string[];
    grupos: string[];
  };
}

export default function Contatos() {
  // Estados
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [sortBy, setSortBy] = useState('nome-asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContatos, setTotalContatos] = useState(0);
  const [selectedContatos, setSelectedContatos] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allGrupos, setAllGrupos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Carregar contatos
  useEffect(() => {
    buscarContatos();
  }, [page, selectedGrupo, sortBy]);
  
  // Função para buscar contatos
  const buscarContatos = async (searchQuery = searchTerm) => {
    try {
      setLoading(true);
      
      let url = `/api/contatos?page=${page}&limit=10`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (selectedGrupo) {
        url += `&grupo=${encodeURIComponent(selectedGrupo)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao buscar contatos');
      }
      
      const data: ContatosResponse = await response.json();
      
      if (data.success) {
        setContatos(data.data.contatos);
        setTotalPages(data.data.totalPages);
        setTotalContatos(data.data.total);
        setAllTags(data.data.tags);
        setAllGrupos(data.data.grupos);
        setError(null);
      } else {
        setError('Erro ao buscar contatos');
      }
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
      setError('Não foi possível carregar os contatos');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para pesquisar
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Volta para a primeira página ao pesquisar
    buscarContatos();
  };
  
  // Função para excluir contato
  const excluirContato = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/contatos?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao excluir contato');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Remover contato da lista
        setContatos(contatos.filter(contato => contato._id !== id));
        setTotalContatos(totalContatos - 1);
        
        // Se estiver na última página e não houver mais contatos, voltar para página anterior
        if (contatos.length === 1 && page > 1) {
          setPage(page - 1);
        }
        
        alert('Contato excluído com sucesso!');
      } else {
        alert(data.message || 'Erro ao excluir contato');
      }
    } catch (err) {
      console.error('Erro ao excluir contato:', err);
      alert('Não foi possível excluir o contato');
    }
  };
  
  // Função para excluir múltiplos contatos
  const excluirContatosSelecionados = async () => {
    if (selectedContatos.length === 0) {
      alert('Selecione pelo menos um contato para excluir');
      return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedContatos.length} contato(s)?`)) {
      return;
    }
    
    try {
      let excluidos = 0;
      
      for (const id of selectedContatos) {
        const response = await fetch(`/api/contatos?id=${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          excluidos++;
        }
      }
      
      // Atualizar lista
      await buscarContatos();
      setSelectedContatos([]);
      
      alert(`${excluidos} contato(s) excluído(s) com sucesso!`);
    } catch (err) {
      console.error('Erro ao excluir contatos:', err);
      alert('Ocorreu um erro ao excluir os contatos');
    }
  };
  
  // Função para selecionar/deselecionar todos os contatos
  const toggleSelectAll = () => {
    if (selectedContatos.length === contatos.length) {
      setSelectedContatos([]);
    } else {
      setSelectedContatos(contatos.map(c => c._id));
    }
  };
  
  // Função para selecionar/deselecionar um contato
  const toggleSelectContato = (id: string) => {
    if (selectedContatos.includes(id)) {
      setSelectedContatos(selectedContatos.filter(c => c !== id));
    } else {
      setSelectedContatos([...selectedContatos, id]);
    }
  };
  
  // Exibir iniciais do nome
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  
  // Formatar telefone
  const formatarTelefone = (numero: string) => {
    // Remove caracteres não numéricos
    const apenasNumeros = numero.replace(/\D/g, '');
    
    // Se for número brasileiro
    if (apenasNumeros.length === 11) {
      return `(${apenasNumeros.substring(0, 2)}) ${apenasNumeros.substring(2, 7)}-${apenasNumeros.substring(7)}`;
    } else if (apenasNumeros.length === 10) {
      return `(${apenasNumeros.substring(0, 2)}) ${apenasNumeros.substring(2, 6)}-${apenasNumeros.substring(6)}`;
    }
    
    // Se não, retornar formato original
    return numero;
  };
  
  return (
    <DashboardLayout pageTitle="Contatos">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-md">
          <form onSubmit={handleSearch}>
            <div className="flex">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiSearch className="text-gray-400" />
                </div>
                <input
                  type="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Buscar contatos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                className="ml-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
        
        <div className="flex gap-3">
          <input 
            type="file" 
            id="importFile" 
            accept=".csv,.xlsx,.xls" 
            className="hidden" 
            onChange={() => alert('Importação de contatos será implementada em breve')}
          />
          <label 
            htmlFor="importFile" 
            className="inline-flex items-center text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
          >
            <HiUpload className="mr-2" />
            Importar
          </label>
          <button 
            className="inline-flex items-center text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            onClick={() => alert('Exportação de contatos será implementada em breve')}
          >
            <HiDownload className="mr-2" />
            Exportar
          </button>
          <Link
            href="/contatos/novo"
            className="inline-flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <HiPlus className="mr-2" />
            Adicionar
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              className="rounded border-gray-300 text-blue-600"
              checked={contatos.length > 0 && selectedContatos.length === contatos.length}
              onChange={toggleSelectAll}
            />
            <span className="text-sm font-medium text-gray-700">
              {totalContatos} contato{totalContatos !== 1 ? 's' : ''}
              {selectedContatos.length > 0 && ` (${selectedContatos.length} selecionado${selectedContatos.length !== 1 ? 's' : ''})`}
            </span>
            
            {selectedContatos.length > 0 && (
              <button 
                className="text-sm text-red-600 hover:text-red-800 ml-4"
                onClick={excluirContatosSelecionados}
              >
                <HiTrash className="inline mr-1" /> Excluir selecionados
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <select 
              className="text-sm border-gray-300 rounded-md"
              value={selectedGrupo}
              onChange={(e) => {
                setSelectedGrupo(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os grupos</option>
              {allGrupos.map(grupo => (
                <option key={grupo} value={grupo}>{grupo}</option>
              ))}
            </select>
            
            <select 
              className="text-sm border-gray-300 rounded-md"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="nome-asc">Nome (A-Z)</option>
              <option value="nome-desc">Nome (Z-A)</option>
              <option value="recente">Mais recentes</option>
              <option value="antigo">Mais antigos</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-gray-900 border-r-2 border-gray-900 border-b-2 border-gray-900 border-l-2 border-gray-100"></div>
            <p className="mt-2 text-gray-600">Carregando contatos...</p>
          </div>
        ) : contatos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum contato encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? 'Tente uma busca diferente ou ' : 'Vamos '}
              <Link href="/contatos/novo" className="text-blue-600 hover:underline">adicionar um novo contato</Link>
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600"
                    checked={contatos.length > 0 && selectedContatos.length === contatos.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grupo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contatos.map((contato) => (
                <tr key={contato._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600"
                      checked={selectedContatos.includes(contato._id)}
                      onChange={() => toggleSelectContato(contato._id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {getInitials(contato.nome)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{contato.nome}</div>
                        {contato.email && <div className="text-sm text-gray-500">{contato.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatarTelefone(contato.telefone)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contato.grupos && contato.grupos.length > 0 ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {contato.grupos[0]}
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Geral
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contato.tags && contato.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {contato.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                            {tag}
                          </span>
                        ))}
                        {contato.tags.length > 2 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded-md text-xs">
                            +{contato.tags.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Sem tags</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/contatos/editar/${contato._id}`} className="text-gray-500 hover:text-blue-600">
                        <HiPencil />
                      </Link>
                      <button 
                        className="text-gray-500 hover:text-red-600"
                        onClick={() => excluirContato(contato._id)}
                      >
                        <HiTrash />
                      </button>
                      <button className="text-gray-500 hover:text-green-600">
                        <HiUserAdd />
                      </button>
                      <div className="relative">
                        <button className="text-gray-500 hover:text-gray-700">
                          <HiDotsVertical />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page <= 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page >= totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(page - 1) * 10 + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(page * 10, totalContatos)}</span> de{' '}
                  <span className="font-medium">{totalContatos}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      page <= 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    &larr;
                  </button>
                  
                  {/* Mostrar páginas dinâmicas */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Calcular qual página mostrar baseado na página atual
                    let pageToShow;
                    if (totalPages <= 5) {
                      pageToShow = i + 1;
                    } else if (page <= 3) {
                      pageToShow = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageToShow = totalPages - 4 + i;
                    } else {
                      pageToShow = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageToShow}
                        onClick={() => setPage(pageToShow)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageToShow
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageToShow}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      page >= totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Próximo</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 