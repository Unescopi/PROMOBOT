"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type MediaType = 'text' | 'image' | 'video' | 'document';

interface Contato {
  id?: string;
  nome: string;
  telefone: string;
  email?: string;
  grupo?: string;
  tags?: string[];
  observacoes?: string;
}

interface Campanha {
  id?: string;
  nome: string;
  mensagem: string;
  tipo: MediaType;
  mediaUrl?: string;
  grupos?: string[];
  tags?: string[];
  contatosSelecionados?: string[];
  dataAgendamento?: Date | null;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  estatisticas?: {
    total: number;
    enviadas: number;
    entregues: number;
    lidas: number;
    falhas: number;
  };
}

interface Mensagem {
  id?: string;
  telefone: string;
  mensagem: string;
  tipo: MediaType;
  mediaUrl?: string;
  campanhaId?: string;
  status: string;
  dataEnvio: Date;
}

interface AppContextProps {
  contatos: Contato[];
  setContatos: React.Dispatch<React.SetStateAction<Contato[]>>;
  campanhas: Campanha[];
  setCampanhas: React.Dispatch<React.SetStateAction<Campanha[]>>;
  mensagens: Mensagem[];
  setMensagens: React.Dispatch<React.SetStateAction<Mensagem[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  addContato: (contato: Contato) => Promise<void>;
  addCampanha: (campanha: Campanha) => Promise<void>;
  enviarMensagem: (mensagem: Mensagem) => Promise<void>;
  getUserInfo: () => { nome: string; email: string; empresa: string };
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);

  // Função para carregar dados iniciais
  useEffect(() => {
    // Aqui podemos carregar dados do localStorage ou fazer chamadas à API
    const carregarDadosIniciais = async () => {
      setLoading(true);
      try {
        // Simulação de chamadas à API
        setTimeout(() => {
          // Dados mockados para contatos
          setContatos([
            {
              id: '1',
              nome: 'João da Silva',
              telefone: '11987654321',
              email: 'joao@email.com',
              grupo: 'Cliente',
              tags: ['Café da manhã', 'VIP']
            },
            {
              id: '2',
              nome: 'Maria Oliveira',
              telefone: '11912345678',
              email: 'maria@email.com',
              grupo: 'VIP',
              tags: ['Happy hour', 'Doces']
            }
          ]);
          
          // Dados mockados para campanhas
          setCampanhas([
            {
              id: '1',
              nome: 'Café da Manhã Especial',
              mensagem: 'Aproveite nosso especial de croissants com 20% de desconto!',
              tipo: 'text',
              status: 'em_andamento',
              estatisticas: {
                total: 132,
                enviadas: 132,
                entregues: 130,
                lidas: 95,
                falhas: 2
              },
            },
            {
              id: '2',
              nome: 'Happy Hour Sexta',
              mensagem: 'Venha aproveitar nossa promoção de drinks na sexta!',
              tipo: 'image',
              mediaUrl: 'https://example.com/happy-hour.jpg',
              status: 'agendada',
              dataAgendamento: new Date('2023-04-05'),
              estatisticas: {
                total: 87,
                enviadas: 0,
                entregues: 0,
                lidas: 0,
                falhas: 0
              },
            }
          ]);
          
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };
    
    carregarDadosIniciais();
  }, []);

  const addContato = async (contato: Contato) => {
    setLoading(true);
    try {
      // Simulação de cadastro de contato
      const novoContato = {
        ...contato,
        id: Date.now().toString() // ID temporário
      };
      
      // Simulamos uma chamada à API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setContatos(prev => [...prev, novoContato]);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao adicionar contato:', error);
      setLoading(false);
      throw error;
    }
  };

  const addCampanha = async (campanha: Campanha) => {
    setLoading(true);
    try {
      // Simulação de cadastro de campanha
      const novaCampanha = {
        ...campanha,
        id: Date.now().toString(), // ID temporário
        estatisticas: {
          total: campanha.contatosSelecionados?.length || 0,
          enviadas: 0,
          entregues: 0,
          lidas: 0,
          falhas: 0
        }
      };
      
      // Simulamos uma chamada à API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCampanhas(prev => [...prev, novaCampanha]);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao adicionar campanha:', error);
      setLoading(false);
      throw error;
    }
  };

  const enviarMensagem = async (mensagem: Mensagem) => {
    setLoading(true);
    try {
      // Simulação de envio de mensagem
      const novaMensagem = {
        ...mensagem,
        id: Date.now().toString(), // ID temporário
        dataEnvio: new Date()
      };
      
      // Simulamos uma chamada à API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setMensagens(prev => [...prev, novaMensagem]);
      
      // Atualizar estatísticas da campanha se for parte de uma
      if (mensagem.campanhaId) {
        setCampanhas(prev => prev.map(campanha => 
          campanha.id === mensagem.campanhaId 
            ? {
                ...campanha,
                estatisticas: {
                  ...campanha.estatisticas!,
                  enviadas: (campanha.estatisticas?.enviadas || 0) + 1
                }
              }
            : campanha
        ));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setLoading(false);
      throw error;
    }
  };

  const getUserInfo = () => {
    return {
      nome: 'Administrador',
      email: 'admin@promobot.com',
      empresa: 'Minha Cafeteria'
    };
  };

  return (
    <AppContext.Provider value={{
      contatos,
      setContatos,
      campanhas,
      setCampanhas,
      mensagens,
      setMensagens,
      loading,
      setLoading,
      addContato,
      addCampanha,
      enviarMensagem,
      getUserInfo
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de um AppProvider');
  }
  return context;
}; 