"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  HiOutlineDocumentReport, 
  HiOutlineCalendar, 
  HiOutlineDownload, 
  HiOutlineFilter,
  HiOutlineUsers,
  HiOutlineMail,
  HiOutlineRefresh,
  HiOutlineChartBar
} from 'react-icons/hi';
import StatisticsService from '@/services/statisticsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ReportType = 'campanhas' | 'contatos' | 'mensagens' | 'desempenho';

interface ReportFilter {
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  status?: string;
}

export default function Relatorios() {
  const [activeReport, setActiveReport] = useState<ReportType>('campanhas');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<ReportFilter>({
    dataInicio: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    dataFim: format(new Date(), 'yyyy-MM-dd')
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Carregar dados iniciais
  useEffect(() => {
    loadReportData();
  }, [activeReport]);
  
  const loadReportData = async () => {
    try {
      setIsLoading(true);
      // Em uma implementação real, buscaríamos dados da API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular carregamento
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };
  
  const handleExportReport = async (formatType: 'csv' | 'pdf' | 'excel') => {
    try {
      setIsLoading(true);
      
      // Em uma implementação real, faríamos uma chamada à API para gerar o relatório
      // Por enquanto, simulamos o processo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular download de arquivo
      const fileName = `relatorio_${activeReport}_${format(new Date(), 'dd-MM-yyyy')}.${formatType}`;
      const downloadUrl = StatisticsService.getExportUrl();
      
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsLoading(false);
    } catch (error) {
      console.error(`Erro ao exportar relatório como ${formatType}:`, error);
      setIsLoading(false);
    }
  };
  
  // Menu de tipos de relatórios
  const reportTypes = [
    { id: 'campanhas', label: 'Campanhas', icon: <HiOutlineMail /> },
    { id: 'contatos', label: 'Contatos', icon: <HiOutlineUsers /> },
    { id: 'mensagens', label: 'Mensagens', icon: <HiOutlineDocumentReport /> },
    { id: 'desempenho', label: 'Desempenho', icon: <HiOutlineChartBar /> }
  ];
  
  return (
    <DashboardLayout pageTitle="Relatórios">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Relatórios</h1>
            <p className="text-gray-600 text-sm">Visualize e exporte dados detalhados do sistema</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <HiOutlineFilter className="mr-2 h-5 w-5 text-gray-500" />
              Filtros
            </button>
            
            <button
              onClick={() => loadReportData()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={isLoading}
            >
              <HiOutlineRefresh className={`mr-2 h-5 w-5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                id="export-menu"
                aria-expanded="true"
                aria-haspopup="true"
              >
                <HiOutlineDownload className="mr-2 h-5 w-5 text-gray-500" />
                Exportar
              </button>
              
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 hidden">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="export-menu">
                  <button 
                    onClick={() => handleExportReport('csv')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                    role="menuitem"
                  >
                    Exportar como CSV
                  </button>
                  <button 
                    onClick={() => handleExportReport('excel')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                    role="menuitem"
                  >
                    Exportar como Excel
                  </button>
                  <button 
                    onClick={() => handleExportReport('pdf')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                    role="menuitem"
                  >
                    Exportar como PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filtros */}
        {showFilters && (
          <div className="bg-white shadow rounded-lg p-6 mb-6 animate-fadeIn">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Filtros do Relatório</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  name="dataInicio"
                  id="dataInicio"
                  value={filter.dataInicio}
                  onChange={handleFilterChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  name="dataFim"
                  id="dataFim"
                  value={filter.dataFim}
                  onChange={handleFilterChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              {activeReport === 'campanhas' && (
                <>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      id="status"
                      value={filter.status}
                      onChange={handleFilterChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Todos os status</option>
                      <option value="draft">Rascunho</option>
                      <option value="scheduled">Agendada</option>
                      <option value="running">Em execução</option>
                      <option value="paused">Pausada</option>
                      <option value="completed">Concluída</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo
                    </label>
                    <select
                      name="tipo"
                      id="tipo"
                      value={filter.tipo}
                      onChange={handleFilterChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Todos os tipos</option>
                      <option value="texto">Texto</option>
                      <option value="imagem">Imagem</option>
                      <option value="video">Vídeo</option>
                      <option value="documento">Documento</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => loadReportData()}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}
        
        {/* Seleção de tipo de relatório */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-200">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveReport(type.id as ReportType)}
                className={`py-4 px-4 text-center hover:bg-gray-50 flex flex-col items-center justify-center ${
                  activeReport === type.id ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500'
                }`}
              >
                <div className={`p-2 rounded-full ${activeReport === type.id ? 'bg-blue-100' : 'bg-gray-100'} mb-2`}>
                  {type.icon}
                </div>
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Conteúdo do relatório */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando dados do relatório...</p>
            </div>
          ) : (
            <div>
              {activeReport === 'campanhas' && (
                <div>
                  <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Relatório de Campanhas</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Visão detalhada de todas as campanhas no período selecionado
                    </p>
                  </div>
                  
                  <div className="p-6 text-center">
                    <HiOutlineMail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Nenhuma campanha encontrada</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Não há campanhas no período selecionado ou com os filtros aplicados
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={() => setShowFilters(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <HiOutlineFilter className="mr-2 h-5 w-5" />
                        Ajustar filtros
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {activeReport === 'contatos' && (
                <div className="p-6">
                  <div className="text-center py-10">
                    <HiOutlineUsers className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Relatório de Contatos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Relatórios de contatos estarão disponíveis em breve
                    </p>
                  </div>
                </div>
              )}
              
              {activeReport === 'mensagens' && (
                <div className="p-6">
                  <div className="text-center py-10">
                    <HiOutlineMail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Relatório de Mensagens</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Relatórios de mensagens estarão disponíveis em breve
                    </p>
                  </div>
                </div>
              )}
              
              {activeReport === 'desempenho' && (
                <div className="p-6">
                  <div className="text-center py-10">
                    <HiOutlineChartBar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Relatório de Desempenho</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Relatórios de desempenho estarão disponíveis em breve
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 