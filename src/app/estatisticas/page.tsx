"use client";

import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HiFilter, HiDownload, HiCheckCircle, HiXCircle, HiClock, HiEye } from 'react-icons/hi';
import StatisticsService, { GlobalStatistics, ChartData } from '@/services/statisticsService';
import Chart from 'chart.js/auto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Estatisticas() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messagesChartData, setMessagesChartData] = useState<ChartData | null>(null);
  const [statusChartData, setStatusChartData] = useState<ChartData | null>(null);
  
  const messagesChartRef = useRef<HTMLCanvasElement>(null);
  const statusChartRef = useRef<HTMLCanvasElement>(null);
  
  const messagesChartInstance = useRef<Chart | null>(null);
  const statusChartInstance = useRef<Chart | null>(null);
  
  // Carregar estatísticas reais
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar estatísticas globais
        const data = await StatisticsService.getGlobalStatistics();
        setStats(data);
        
        // Buscar dados para gráficos
        const messagesPerDay = await StatisticsService.getMessagesPerDayChart(30);
        setMessagesChartData(messagesPerDay);
        
        const statusDistribution = await StatisticsService.getMessageStatusDistribution();
        setStatusChartData(statusDistribution);
        
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        setError('Não foi possível carregar as estatísticas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Renderizar gráficos quando os dados estiverem disponíveis
  useEffect(() => {
    if (!loading && messagesChartData && messagesChartRef.current) {
      // Destruir gráfico anterior se existir
      if (messagesChartInstance.current) {
        messagesChartInstance.current.destroy();
      }
      
      // Criar gráfico de linha para mensagens por dia
      const ctx = messagesChartRef.current.getContext('2d');
      if (ctx) {
        messagesChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: messagesChartData.labels,
            datasets: [{
              label: 'Mensagens Enviadas',
              data: messagesChartData.datasets[0].data,
              fill: true,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: '#3b82f6',
              tension: 0.4,
              pointRadius: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  display: true
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }
    }
    
    if (!loading && statusChartData && statusChartRef.current) {
      // Destruir gráfico anterior se existir
      if (statusChartInstance.current) {
        statusChartInstance.current.destroy();
      }
      
      // Criar gráfico de pizza para distribuição de status
      const ctx = statusChartRef.current.getContext('2d');
      if (ctx) {
        statusChartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: statusChartData.labels,
            datasets: [{
              data: statusChartData.datasets[0].data,
              backgroundColor: statusChartData.datasets[0].backgroundColor as string[],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              }
            },
            cutout: '60%'
          }
        });
      }
    }
    
    // Limpar gráficos ao desmontar componente
    return () => {
      if (messagesChartInstance.current) {
        messagesChartInstance.current.destroy();
      }
      if (statusChartInstance.current) {
        statusChartInstance.current.destroy();
      }
    };
  }, [loading, messagesChartData, statusChartData]);
  
  // Função para formatar o valor com + ou - na variação
  const formatVariation = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };
  
  // Função para obter a classe de cor com base na variação
  const getVariationClass = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };
  
  // Função para exportar dados em CSV
  const handleExportData = async () => {
    try {
      // Em uma implementação real, chamaria o serviço para gerar e baixar o CSV
      const downloadUrl = StatisticsService.getExportUrl();
      
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `estatisticas_${format(new Date(), 'dd-MM-yyyy')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };
  
  return (
    <DashboardLayout pageTitle="Estatísticas">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Estatísticas</h1>
          <p className="text-gray-600 text-sm">
            Análise detalhada de mensagens e campanhas
            {!loading && stats?.lastUpdated && (
              <span className="text-xs text-gray-500 ml-2">
                (Atualizado em: {new Date(stats.lastUpdated).toLocaleString('pt-BR')})
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            className="inline-flex items-center text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            onClick={() => {}}
          >
            <HiFilter className="mr-2" />
            Filtrar
          </button>
          <button 
            className="inline-flex items-center text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            onClick={handleExportData}
          >
            <HiDownload className="mr-2" />
            Exportar
          </button>
        </div>
      </div>
      
      {/* Resumo em cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total de Mensagens</p>
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-bold">{stats?.totalMessages?.toLocaleString('pt-BR') || 0}</h3>
              )}
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <HiClock className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          {!loading && (
            <div className="mt-4 text-xs text-gray-600">
              <span className="text-green-600 font-medium">{stats?.messagesLastWeek?.toLocaleString('pt-BR') || 0}</span> na última semana
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Taxa de Entrega</p>
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-bold">{stats?.deliveryRate?.toFixed(1) || 0}%</h3>
              )}
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <HiCheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          {!loading && (
            <div className="mt-4 text-xs text-gray-600">
              {stats?.totalMessages ? (
                <span className={getVariationClass(3.2)}>
                  {formatVariation(3.2)}
                </span>
              ) : (
                <span className="text-gray-500">Sem dados de comparação</span>
              )} em relação ao mês anterior
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Taxa de Leitura</p>
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-bold">{stats?.readRate?.toFixed(1) || 0}%</h3>
              )}
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <HiEye className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {!loading && (
            <div className="mt-4 text-xs text-gray-600">
              {stats?.totalMessages ? (
                <span className={getVariationClass(-2.1)}>
                  {formatVariation(-2.1)}
                </span>
              ) : (
                <span className="text-gray-500">Sem dados de comparação</span>
              )} em relação ao mês anterior
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Taxa de Falha</p>
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-bold">
                  {stats?.totalMessages && stats?.deliveryRate 
                    ? (100 - stats.deliveryRate).toFixed(1) 
                    : "0.0"}%
                </h3>
              )}
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <HiXCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          {!loading && (
            <div className="mt-4 text-xs text-gray-600">
              {stats?.totalMessages ? (
                <span className={getVariationClass(-1.5)}>
                  {formatVariation(-1.5)}
                </span>
              ) : (
                <span className="text-gray-500">Sem dados de comparação</span>
              )} em relação ao mês anterior
            </div>
          )}
        </div>
      </div>
      
      {/* Gráfico Principal */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-800">Desempenho de Mensagens</h3>
          <div className="flex items-center">
            <select className="text-sm border-gray-300 rounded-md mr-2">
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>
        </div>
        
        {/* Gráfico de linha com Chart.js */}
        {loading ? (
          <div className="h-80 bg-gray-200 rounded-lg animate-pulse"></div>
        ) : (
          <div className="h-80">
            <canvas ref={messagesChartRef}></canvas>
          </div>
        )}
        
        {loading ? (
          <div className="mt-4 grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Enviadas</p>
              <p className="font-medium">{stats?.totalMessages?.toLocaleString('pt-BR') || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Entregues</p>
              <p className="font-medium">
                {stats?.totalMessages && stats?.deliveryRate
                  ? Math.round(stats.totalMessages * (stats.deliveryRate / 100)).toLocaleString('pt-BR')
                  : 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Lidas</p>
              <p className="font-medium">
                {stats?.totalMessages && stats?.deliveryRate && stats?.readRate
                  ? Math.round(
                      stats.totalMessages * 
                      (stats.deliveryRate / 100) * 
                      (stats.readRate / 100)
                    ).toLocaleString('pt-BR')
                  : 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Falhas</p>
              <p className="font-medium">
                {stats?.totalMessages && stats?.deliveryRate
                  ? Math.round(stats.totalMessages * (1 - stats.deliveryRate / 100)).toLocaleString('pt-BR')
                  : 0}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Estatísticas das últimas campanhas e distribuição de status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Desempenho por Campanha</h3>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : stats?.totalCampaigns && stats.totalCampaigns > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campanha
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enviadas
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxa Entrega
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxa Leitura
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Exemplos de campanhas para a tabela. Em uma implementação real, estes dados viriam da API */}
                  <tr>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">Promoção Black Friday</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">2.546</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">98.5%</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">87.2%</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">Lançamento Produto</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">1.872</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">97.8%</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">92.1%</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">Notificação de Estoque</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">953</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">99.1%</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">89.7%</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">Pesquisa de Satisfação</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">1.235</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">95.2%</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">79.8%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 text-center rounded-lg">
              <p className="text-gray-500">Nenhuma campanha encontrada</p>
              <p className="text-sm text-gray-400 mt-1">Crie campanhas para ver estatísticas detalhadas aqui</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Distribuição de Status</h3>
          
          {loading ? (
            <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ) : stats?.totalMessages && stats.totalMessages > 0 ? (
            <div className="h-64">
              <canvas ref={statusChartRef}></canvas>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-gray-500">Sem dados de mensagens</p>
                <p className="text-sm text-gray-400 mt-1">Envie mensagens para ver estatísticas aqui</p>
              </div>
            </div>
          )}
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Taxa de Entrega</p>
              <p className="font-medium text-green-600">{stats?.deliveryRate?.toFixed(1) || 0}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Taxa de Leitura</p>
              <p className="font-medium text-blue-600">{stats?.readRate?.toFixed(1) || 0}%</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 