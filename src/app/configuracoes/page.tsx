"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HiCog, HiSave, HiRefresh, HiShieldCheck, HiClock, HiTemplate, HiPhone, HiServer, HiX, HiCheck, HiPlus, HiTrash } from 'react-icons/hi';
import { useRouter } from 'next/navigation';

export default function Configuracoes() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('geral');
  // Estado para IP permitidos na seção de Segurança
  const [ipAddresses, setIpAddresses] = useState<string[]>(['192.168.1.1']);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Estado para rastrear se o banco de dados está disponível
  const [dbOffline, setDbOffline] = useState(false);
  
  // Estados para armazenar os dados do formulário
  const [formData, setFormData] = useState({
    geral: {
      nomeEmpresa: 'Minha Cafeteria',
      timezone: 'America/Sao_Paulo',
      lingua: 'pt_BR',
      notificacoes: true
    },
    whatsapp: {
      evolutionApiUrl: 'http://localhost:8080',
      apiKey: 'sua_chave_api_aqui',
      webhookUrl: 'https://seudominio.com/api/webhook'
    },
    mensagens: {
      delayEntreMensagens: 2000,
      maxLote: 100,
      assinatura: '',
      permitirPersonalizacao: true
    },
    agendamentos: {
      intervaloProcessamento: 5,
      horarioInicio: '08:00',
      horarioFim: '20:00',
      permitirFeriados: false,
      permitirFinaisSemana: true,
      tempoExpirar: 48
    },
    api: {
      chaveApi: 'sk_live_51JKltKbNprtBKgH',
      webhookSegredo: 'whsec_8K4j9GhZlkPQmsU',
      habilitarApi: true
    },
    seguranca: {
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: '',
      doisFatores: false,
      registrarAtividades: true
    }
  });
  
  // Função para carregar configurações do servidor
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        // Tentar carregar do servidor
        const resposta = await fetch('/api/configuracoes');
        
        if (resposta.ok) {
          const { success, data } = await resposta.json();
          
          if (success && data) {
            // Mapear dados recebidos para o formato do formData
            setFormData({
              geral: {
                nomeEmpresa: data.nomeEmpresa || 'Minha Cafeteria',
                timezone: data.timezone || 'America/Sao_Paulo',
                lingua: data.lingua || 'pt_BR',
                notificacoes: true
              },
              whatsapp: {
                evolutionApiUrl: data.evolutionApiUrl || 'http://localhost:8080',
                apiKey: data.apiKey || '',
                webhookUrl: 'https://seudominio.com/api/webhook' // Campo padrão
              },
              mensagens: {
                delayEntreMensagens: data.intervaloEnvios || 2000,
                maxLote: data.maxMensagensDia || 100,
                assinatura: data.assinatura || '',
                permitirPersonalizacao: true
              },
              agendamentos: {
                intervaloProcessamento: data.intervaloProcessamento || 5,
                horarioInicio: data.horarioInicio || '08:00',
                horarioFim: data.horarioFim || '20:00',
                permitirFeriados: false,
                permitirFinaisSemana: true,
                tempoExpirar: 48
              },
              api: {
                chaveApi: data.apiKeyExternal || 'sk_live_51JKltKbNprtBKgH',
                webhookSegredo: data.webhookSegredo || 'whsec_8K4j9GhZlkPQmsU', 
                habilitarApi: true
              },
              seguranca: {
                senhaAtual: '',
                novaSenha: '',
                confirmarSenha: '',
                doisFatores: false,
                registrarAtividades: true
              }
            });
            
            // Se houver IPs permitidos, atualize o estado
            if (data.ipPermitidos && Array.isArray(data.ipPermitidos)) {
              setIpAddresses(data.ipPermitidos);
            }
            
            // Banco de dados está online
            setDbOffline(false);
          }
        } else {
          // Verificar se o erro é específico do MongoDB
          const data = await resposta.json();
          if (data.isMongoDB || (data.error && data.error.includes('ECONNREFUSED'))) {
            setDbOffline(true);
          }
          throw new Error('Erro ao carregar configurações do servidor');
        }
      } catch (error) {
        console.warn('Erro ao carregar configurações do servidor, tentando localStorage:', error);
        
        // Verificar se o erro é de conexão com MongoDB
        if (error instanceof Error && error.message.includes('MongoDB')) {
          setDbOffline(true);
        }
        
        // Fallback para localStorage se o servidor não responder
        try {
          const savedConfig = localStorage.getItem('promobot_config');
          const savedIPs = localStorage.getItem('promobot_ip_addresses');
          
          if (savedConfig) {
            setFormData(JSON.parse(savedConfig));
          }
          
          if (savedIPs) {
            setIpAddresses(JSON.parse(savedIPs));
          }
        } catch (localError) {
          console.error('Erro ao carregar configurações locais:', localError);
        }
      }
    };
    
    carregarConfiguracoes();
  }, []);
  
  // Função para lidar com alterações nos campos de entrada
  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section as keyof typeof formData],
        [field]: value
      }
    });
  };
  
  // Função para verificar conexão com WhatsApp
  const verificarConexao = () => {
    // Simulando verificação de conexão
    alert('Verificando conexão com Evolution API...');
    // Em um caso real, faria uma requisição para o endpoint de verificação
  };
  
  // Função para copiar para o clipboard
  const copiarParaClipboard = (texto: string) => {
    navigator.clipboard.writeText(texto);
    alert('Copiado para a área de transferência!');
  };
  
  // Função para gerar nova chave
  const gerarNovaChave = (tipo: 'api' | 'webhook') => {
    const novaChave = 'novo_' + Math.random().toString(36).substring(2, 15);
    if (tipo === 'api') {
      handleInputChange('api', 'chaveApi', novaChave);
    } else {
      handleInputChange('api', 'webhookSegredo', novaChave);
    }
    alert(`Nova chave ${tipo} gerada!`);
  };
  
  // Função para adicionar novo IP
  const addIpAddress = () => {
    if (newIpAddress && !ipAddresses.includes(newIpAddress)) {
      setIpAddresses([...ipAddresses, newIpAddress]);
      setNewIpAddress('');
    }
  };
  
  // Função para remover IP
  const removeIpAddress = (ip: string) => {
    setIpAddresses(ipAddresses.filter(address => address !== ip));
  };
  
  // Função para salvar configurações
  const salvarConfiguracoes = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Verificar campos obrigatórios
      if (!formData.geral.nomeEmpresa?.trim()) {
        throw new Error('Nome da empresa é obrigatório');
      }
      
      // Validar formato do Webhook se preenchido
      if (formData.api.webhookSegredo && 
          !/^[A-Za-z0-9_]+$/.test(formData.api.webhookSegredo)) {
        throw new Error('Segredo do Webhook contém caracteres inválidos');
      }
      
      // Preparar dados para envio no formato esperado pela API
      const dadosConfig = {
        geral: {
          nomeEmpresa: formData.geral.nomeEmpresa,
          timezone: formData.geral.timezone,
          lingua: formData.geral.lingua
        },
        whatsapp: {
          whatsappNumber: "", // Este campo será preenchido no backend se necessário
        },
        mensagens: {
          assinatura: formData.mensagens.assinatura,
          maxLote: formData.mensagens.maxLote,
          delayEntreMensagens: formData.mensagens.delayEntreMensagens
        },
        agendamentos: {
          intervaloProcessamento: formData.agendamentos.intervaloProcessamento,
          horarioInicio: formData.agendamentos.horarioInicio,
          horarioFim: formData.agendamentos.horarioFim
        },
        api: {
          webhookSegredo: formData.api.webhookSegredo,
          chaveApi: formData.api.chaveApi,
          habilitarApi: formData.api.habilitarApi
        },
        seguranca: {
          ipAddresses
        }
      };
      
      console.log('Enviando configurações:', dadosConfig);
      
      // Salvar localmente em localStorage como fallback
      localStorage.setItem('promobot_config', JSON.stringify(formData));
      localStorage.setItem('promobot_ip_addresses', JSON.stringify(ipAddresses));
      
      try {
        // Tentar enviar para API
        const response = await fetch('/api/configuracoes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosConfig)
        });
        
        if (!response.ok) {
          const resultData = await response.json();
          
          // Se o erro for de conexão com o MongoDB, mostre uma mensagem específica
          if (resultData.error && resultData.error.includes('ECONNREFUSED')) {
            throw new Error('Banco de dados não está disponível. Configurações salvas localmente.');
          }
          
          // Se há erros de validação no servidor
          if (resultData.errors && Array.isArray(resultData.errors)) {
            throw new Error(`Erros de validação: ${resultData.errors.join(', ')}`);
          }
          throw new Error(resultData.message || 'Erro ao salvar configurações');
        }
        
        const resultData = await response.json();
      } catch (apiError) {
        // Se for erro de conexão com servidor, ainda mostramos sucesso pelo localStorage
        if (apiError instanceof Error && 
            (apiError.message.includes('fetch failed') || 
             apiError.message.includes('banco de dados') ||
             apiError.message.includes('Failed to fetch'))) {
          console.warn('Erro ao salvar no servidor, usando localStorage:', apiError);
          // Não fazemos re-throw, permitindo que o resto da função continue
        } else {
          throw apiError; // Re-throw para outros tipos de erro
        }
      }
      
      // Mostrar mensagem de sucesso
      setSaveSuccess(true);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      
      // Mostrar erro específico
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao salvar configurações: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Função para cancelar alterações
  const cancelarAlteracoes = () => {
    if (confirm('Deseja cancelar as alterações? As mudanças não salvas serão perdidas.')) {
      router.push('/dashboard');
    }
  };
  
  return (
    <DashboardLayout pageTitle="Configurações">
      {dbOffline && (
        <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded" role="alert">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-semibold">Modo Offline:</p>
            <p className="ml-2">O banco de dados MongoDB não está disponível. As configurações serão salvas localmente.</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar de navegação */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-4">
          <h3 className="font-medium text-gray-700 mb-4">Configurações</h3>
          <nav className="flex flex-col space-y-1">
            <button
              onClick={() => setActiveTab('geral')}
              className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                activeTab === 'geral' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiCog className="mr-3 h-5 w-5" />
              Geral
            </button>
            
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                activeTab === 'whatsapp' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiPhone className="mr-3 h-5 w-5" />
              WhatsApp
            </button>
            
            <button
              onClick={() => setActiveTab('mensagens')}
              className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                activeTab === 'mensagens' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiTemplate className="mr-3 h-5 w-5" />
              Mensagens
            </button>
            
            <button
              onClick={() => setActiveTab('agendamentos')}
              className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                activeTab === 'agendamentos' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiClock className="mr-3 h-5 w-5" />
              Agendamentos
            </button>
            
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                activeTab === 'api' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiServer className="mr-3 h-5 w-5" />
              API
            </button>
            
            <button
              onClick={() => setActiveTab('seguranca')}
              className={`flex items-center px-4 py-2 text-sm rounded-lg ${
                activeTab === 'seguranca' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiShieldCheck className="mr-3 h-5 w-5" />
              Segurança
            </button>
          </nav>
        </div>
        
        {/* Conteúdo principal */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Configurações Gerais */}
            {activeTab === 'geral' && (
              <div>
                <h2 className="text-xl font-medium text-gray-800 mb-6">Configurações Gerais</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="nome_empresa" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      id="nome_empresa"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="Minha Cafeteria"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Este nome será usado nas comunicações enviadas aos clientes.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                      Fuso Horário
                    </label>
                    <select
                      id="timezone"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="America/Sao_Paulo"
                    >
                      <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                      <option value="America/Manaus">Manaus (GMT-4)</option>
                      <option value="America/Cuiaba">Cuiabá (GMT-4)</option>
                      <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Usado para agendamento de mensagens e relatórios.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="lingua" className="block text-sm font-medium text-gray-700 mb-1">
                      Idioma
                    </label>
                    <select
                      id="lingua"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="pt_BR"
                    >
                      <option value="pt_BR">Português (Brasil)</option>
                      <option value="en_US">Inglês (EUA)</option>
                      <option value="es_ES">Espanhol</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notificacoes"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      defaultChecked
                    />
                    <label htmlFor="notificacoes" className="ml-2 block text-sm text-gray-700">
                      Receber notificações de campanhas no e-mail
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configurações do WhatsApp */}
            {activeTab === 'whatsapp' && (
              <div>
                <h2 className="text-xl font-medium text-gray-800 mb-6">Configurações do WhatsApp</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="webhook_url" className="block text-sm font-medium text-gray-700 mb-1">
                      URL do Webhook
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        id="webhook_url"
                        className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
                        value="https://seudominio.com/api/webhook"
                        readOnly
                      />
                      <button className="px-4 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg hover:bg-gray-200">
                        Copiar
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Configure esta URL nas opções de webhook da sua instância da Evolution API.
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Status da Conexão</h3>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700">WhatsApp conectado</span>
                    </div>
                    <button className="mt-3 flex items-center text-sm text-blue-600 hover:text-blue-800">
                      <HiRefresh className="mr-1" /> Verificar conexão
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-medium text-blue-800 mb-2">Integração Simplificada</h3>
                    <p className="text-sm text-blue-700">
                      A Evolution API já está configurada localmente na VPS e não requer configurações adicionais.
                      Apenas certifique-se de configurar o URL do webhook acima na sua instância da Evolution API.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configurações de Mensagens */}
            {activeTab === 'mensagens' && (
              <div>
                <h2 className="text-xl font-medium text-gray-800 mb-6">Configurações de Mensagens</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="delay_entre_mensagens" className="block text-sm font-medium text-gray-700 mb-1">
                      Intervalo entre mensagens (ms)
                    </label>
                    <input
                      type="number"
                      id="delay_entre_mensagens"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="2000"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Tempo de espera entre o envio de mensagens em campanhas de massa.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="max_lote" className="block text-sm font-medium text-gray-700 mb-1">
                      Máximo de mensagens por lote
                    </label>
                    <input
                      type="number"
                      id="max_lote"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="100"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Número máximo de mensagens enviadas por lote em campanhas de massa.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="assinatura" className="block text-sm font-medium text-gray-700 mb-1">
                      Assinatura padrão
                    </label>
                    <textarea
                      id="assinatura"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      rows={2}
                      placeholder="Ex: Mensagem enviada por {empresa}"
                    ></textarea>
                    <p className="mt-1 text-xs text-gray-500">
                      Esta assinatura será adicionada ao final das mensagens. Use {'{empresa}'} para inserir o nome da empresa.
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="permitir_personalizacao"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      defaultChecked
                    />
                    <label htmlFor="permitir_personalizacao" className="ml-2 block text-sm text-gray-700">
                      Permitir personalização de mensagens com variáveis
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configurações de Agendamentos */}
            {activeTab === 'agendamentos' && (
              <div>
                <h2 className="text-xl font-medium text-gray-800 mb-6">Configurações de Agendamentos</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="intervalo_processamento" className="block text-sm font-medium text-gray-700 mb-1">
                      Intervalo de processamento (minutos)
                    </label>
                    <input
                      type="number"
                      id="intervalo_processamento"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="5"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Frequência com que o sistema verifica campanhas agendadas para execução.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="horario_inicio" className="block text-sm font-medium text-gray-700 mb-1">
                      Horário de início permitido
                    </label>
                    <input
                      type="time"
                      id="horario_inicio"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="08:00"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Horário mais cedo permitido para iniciar campanhas.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="horario_fim" className="block text-sm font-medium text-gray-700 mb-1">
                      Horário de término permitido
                    </label>
                    <input
                      type="time"
                      id="horario_fim"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="20:00"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Horário mais tarde permitido para campanhas.
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="permitir_feriados"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <label htmlFor="permitir_feriados" className="ml-2 block text-sm text-gray-700">
                      Permitir envio em feriados nacionais
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="permitir_finais_semana"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      defaultChecked
                    />
                    <label htmlFor="permitir_finais_semana" className="ml-2 block text-sm text-gray-700">
                      Permitir envio em finais de semana
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="tempo_expirar" className="block text-sm font-medium text-gray-700 mb-1">
                      Tempo para expirar campanhas não enviadas (horas)
                    </label>
                    <input
                      type="number"
                      id="tempo_expirar"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      defaultValue="48"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Campanhas agendadas serão marcadas como expiradas após este tempo se não forem enviadas.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configurações de API */}
            {activeTab === 'api' && (
              <div>
                <h2 className="text-xl font-medium text-gray-800 mb-6">Configurações de API</h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Chave de API
                      </label>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Gerar nova chave
                      </button>
                    </div>
                    <div className="flex">
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        value="sk_live_51JKltKbNprtBKgH"
                        readOnly
                      />
                      <button className="px-4 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg hover:bg-gray-200">
                        Copiar
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Esta chave é usada para autenticar chamadas à API do PromoBot.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="webhook_segredo" className="block text-sm font-medium text-gray-700 mb-1">
                      Segredo do Webhook
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        id="webhook_segredo"
                        className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
                        defaultValue="whsec_8K4j9GhZlkPQmsU"
                      />
                      <button className="px-4 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg hover:bg-gray-200">
                        Gerar
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Usado para verificar a autenticidade das requisições de webhook.
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-medium text-gray-800 mb-2">Endpoints disponíveis</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">GET /api/contacts</code>
                        <span className="ml-2">Lista todos os contatos</span>
                      </li>
                      <li className="flex items-start">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">POST /api/messages</code>
                        <span className="ml-2">Envia uma mensagem</span>
                      </li>
                      <li className="flex items-start">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">GET /api/campaigns</code>
                        <span className="ml-2">Lista campanhas</span>
                      </li>
                    </ul>
                    <a href="#" className="mt-2 text-sm text-blue-600 hover:text-blue-800 inline-block">
                      Ver documentação completa da API
                    </a>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="habilitar_api"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        defaultChecked
                      />
                      <label htmlFor="habilitar_api" className="ml-2 block text-sm font-medium text-gray-700">
                        Habilitar acesso à API
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Desative para bloquear temporariamente todas as chamadas à API.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configurações de Segurança */}
            {activeTab === 'seguranca' && (
              <div>
                <h2 className="text-xl font-medium text-gray-800 mb-6">Configurações de Segurança</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="senha_atual" className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      id="senha_atual"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="nova_senha" className="block text-sm font-medium text-gray-700 mb-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      id="nova_senha"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Use pelo menos 8 caracteres com letras, números e símbolos.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="confirmar_senha" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      id="confirmar_senha"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Autenticação de Dois Fatores</h3>
                    
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Status: <span className="text-red-600">Desativado</span></p>
                        <p className="text-xs text-gray-500">Recomendamos ativar para maior segurança.</p>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Ativar
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Lista de IPs Permitidos</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Restrinja o acesso à API apenas para os IPs listados abaixo. Deixe em branco para permitir todos.
                    </p>
                    
                    <div className="space-y-2">
                      {ipAddresses.map((ip, index) => (
                        <div key={index} className="flex items-center">
                          <span className="text-sm flex-1">{ip}</span>
                          <button
                            type="button"
                            onClick={() => removeIpAddress(ip)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <HiTrash className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      
                      <div className="flex mt-2">
                        <input
                          type="text"
                          value={newIpAddress}
                          onChange={(e) => setNewIpAddress(e.target.value)}
                          placeholder="Adicionar novo IP"
                          className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={addIpAddress}
                          className="px-4 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg hover:bg-gray-200"
                        >
                          <HiPlus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="registrar_atividades"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      defaultChecked
                    />
                    <label htmlFor="registrar_atividades" className="ml-2 block text-sm text-gray-700">
                      Registrar todas as atividades de usuários
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelarAlteracoes}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarConfiguracoes}
                disabled={isSaving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <HiSave className="inline-block mr-1 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
              
              {saveSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center">
                  <HiCheck className="mr-2" />
                  Configurações salvas com sucesso!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 