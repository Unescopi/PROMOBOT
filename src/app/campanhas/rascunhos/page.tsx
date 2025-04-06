"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { HiPencil, HiTrash, HiOutlinePlay, HiOutlineDuplicate, HiOutlineExclamation } from 'react-icons/hi';
import { toast, Toaster } from 'react-hot-toast';

export default function Rascunhos() {
  const router = useRouter();
  const [rascunhos, setRascunhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchRascunhos();
  }, []);
  
  const fetchRascunhos = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/campanhas?status=draft');
      const data = await response.json();
      
      console.log('Resposta da API de rascunhos:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        if (data.campanhas && Array.isArray(data.campanhas)) {
          console.log('Rascunhos encontrados:', data.campanhas.length);
          setRascunhos(data.campanhas);
        } else {
          console.error('Formato de resposta inesperado:', data);
          setRascunhos([]);
          setError('Formato de resposta inválido do servidor');
        }
      } else {
        console.error('Erro na API:', data.message);
        setError(data.message || 'Erro ao carregar rascunhos');
      }
    } catch (error) {
      console.error('Erro ao buscar rascunhos:', error);
      setError('Não foi possível carregar os rascunhos. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditDraft = (id: string) => {
    router.push(`/campanhas/editar/${id}`);
  };
  
  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };
  
  const handleDuplicateDraft = async (id: string) => {
    try {
      const response = await fetch(`/api/campanhas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'duplicate' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campanha duplicada com sucesso!');
        fetchRascunhos();
      } else {
        toast.error(data.message || 'Erro ao duplicar campanha');
      }
    } catch (error) {
      console.error('Erro ao duplicar campanha:', error);
      toast.error('Falha ao duplicar campanha. Tente novamente.');
    }
  };
  
  const handleDeleteDraft = async () => {
    if (!deleteId) return;
    
    try {
      const response = await fetch(`/api/campanhas/${deleteId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRascunhos(rascunhos.filter((rascunho: any) => rascunho._id !== deleteId));
        toast.success('Rascunho excluído com sucesso!');
      } else {
        toast.error(data.message || 'Erro ao excluir rascunho');
      }
    } catch (error) {
      console.error('Erro ao excluir rascunho:', error);
      toast.error('Falha ao excluir rascunho. Tente novamente.');
    } finally {
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };
  
  const handleLaunchDraft = async (id: string) => {
    try {
      router.push(`/campanhas/editar/${id}?launch=true`);
    } catch (error) {
      console.error('Erro ao lançar campanha:', error);
      toast.error('Falha ao iniciar campanha. Tente novamente.');
    }
  };
  
  return (
    <DashboardLayout pageTitle="Rascunhos de Campanhas">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Rascunhos de Campanhas</h1>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            onClick={() => router.push('/campanhas/nova')}
          >
            <HiPencil className="mr-2" />
            Nova Campanha
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-700 flex items-start">
            <HiOutlineExclamation className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : rascunhos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiPencil className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum rascunho encontrado</h3>
            <p className="text-gray-500 mb-4">Você ainda não criou nenhum rascunho de campanha.</p>
            <button
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push('/campanhas/nova')}
            >
              Criar sua primeira campanha
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destinatários
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Criação
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rascunhos.map((rascunho: any) => (
                  <tr key={rascunho._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rascunho.nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {rascunho.tipo === 'texto' ? 'Texto' : 
                         rascunho.tipo === 'imagem' ? 'Imagem' : 
                         rascunho.tipo === 'video' ? 'Vídeo' : 'Documento'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rascunho.destinatarios?.length || 0} contatos
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rascunho.criadoEm).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditDraft(rascunho._id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar"
                      >
                        <HiPencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleLaunchDraft(rascunho._id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Iniciar campanha"
                      >
                        <HiOutlinePlay className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateDraft(rascunho._id)}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                        title="Duplicar"
                      >
                        <HiOutlineDuplicate className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(rascunho._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Modal de confirmação de exclusão */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <HiOutlineExclamation className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Confirmar exclusão</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="mr-3 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                  onClick={handleDeleteDraft}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
        
        <Toaster position="top-right" />
      </div>
    </DashboardLayout>
  );
} 