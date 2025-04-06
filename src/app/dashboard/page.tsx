"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HiOutlineUsers, HiOutlineMail, HiOutlineDocumentReport, HiOutlineClock, HiOutlineCheck } from 'react-icons/hi';
import StatisticsService from '@/services/statisticsService';
import { GlobalStatistics } from '@/services/statisticsService';
import Link from 'next/link';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Carregar estatísticas
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await StatisticsService.getGlobalStatistics();
        setStats(data);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        setError('Não foi possível carregar as estatísticas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        
        {/* Estatísticas gerais */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-600">Visão Geral do Sistema</h2>
          {!loading && stats?.lastUpdated && (
            <p className="text-xs text-gray-500">
              Última atualização: {new Date(stats.lastUpdated).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Contatos */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-700">Contatos</h3>
              <div className="p-2 bg-blue-100 rounded-full">
                <HiOutlineUsers className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            {loading ? (
              <div className="animate-pulse">
                <div className="h-9 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalContacts || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="text-green-600 font-medium">{stats?.activeContacts || 0}</span> ativos
                </p>
              </>
            )}
          </div>
          
          {/* Campanhas */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-700">Campanhas</h3>
              <div className="p-2 bg-purple-100 rounded-full">
                <HiOutlineDocumentReport className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            
            {loading ? (
              <div className="animate-pulse">
                <div className="h-9 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalCampaigns || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="text-purple-600 font-medium">{stats?.activeCampaigns || 0}</span> ativas
                </p>
              </>
            )}
          </div>
          
          {/* Mensagens */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-700">Mensagens</h3>
              <div className="p-2 bg-green-100 rounded-full">
                <HiOutlineMail className="h-6 w-6 text-green-600" />
              </div>
            </div>
            
            {loading ? (
              <div className="animate-pulse">
                <div className="h-9 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalMessages || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="text-green-600 font-medium">{stats?.messagesLastWeek || 0}</span> últimos 7 dias
                </p>
              </>
            )}
          </div>
          
          {/* Taxa de entrega */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-700">Taxa de Entrega</h3>
              <div className="p-2 bg-yellow-100 rounded-full">
                <HiOutlineCheck className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            
            {loading ? (
              <div className="animate-pulse">
                <div className="h-9 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-800">{stats?.deliveryRate?.toFixed(1) || 0}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${stats?.deliveryRate || 0}%` }}></div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Gráficos e relatórios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Mensagens Enviadas</h3>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">Gráfico de mensagens enviadas</p>
                {/* Em uma implementação real, usaríamos uma biblioteca de gráficos como Chart.js */}
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Métricas de Desempenho</h3>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-14 bg-gray-200 rounded"></div>
                <div className="h-14 bg-gray-200 rounded"></div>
                <div className="h-14 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Taxa de leitura */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Taxa de leitura</span>
                    <span className="text-sm text-gray-600">{stats?.readRate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${stats?.readRate || 0}%` }}></div>
                  </div>
                </div>
                
                {/* Taxa de resposta */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Taxa de resposta</span>
                    <span className="text-sm text-gray-600">{stats?.responseRate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${stats?.responseRate || 0}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Acesso rápido */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/campanhas/nova" 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition flex flex-col items-center text-center">
              <HiOutlineMail className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-gray-800 font-medium">Nova Campanha</span>
              <span className="text-xs text-gray-500 mt-1">Criar uma nova campanha</span>
            </Link>
            
            <Link href="/contatos/novo" 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition flex flex-col items-center text-center">
              <HiOutlineUsers className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-gray-800 font-medium">Novo Contato</span>
              <span className="text-xs text-gray-500 mt-1">Adicionar contato</span>
            </Link>
            
            <Link href="/campanhas" 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition flex flex-col items-center text-center">
              <HiOutlineDocumentReport className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-gray-800 font-medium">Campanhas</span>
              <span className="text-xs text-gray-500 mt-1">Ver todas as campanhas</span>
            </Link>
            
            <Link href="/relatorios" 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-200 transition flex flex-col items-center text-center">
              <HiOutlineClock className="h-8 w-8 text-yellow-600 mb-2" />
              <span className="text-gray-800 font-medium">Relatórios</span>
              <span className="text-xs text-gray-500 mt-1">Análise de desempenho</span>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 