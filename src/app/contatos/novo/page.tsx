"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { HiUser, HiPhone, HiMail, HiTag, HiUserGroup, HiX, HiPlus } from 'react-icons/hi';
import Link from 'next/link';

export default function NovoContato() {
  const router = useRouter();
  
  // Estado para dados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    grupo: 'Geral',
    observacoes: ''
  });
  
  // Estado para tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Estado para controle do formulário
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Função para lidar com mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Função para adicionar tags
  const adicionarTag = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tagInput.trim()) return;
    
    // Verificar se a tag já existe
    if (tags.includes(tagInput.trim())) {
      alert('Esta tag já foi adicionada');
      return;
    }
    
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };
  
  // Função para remover tag
  const removerTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Função para lidar com pressionar Enter no campo de tag
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag(e);
    }
  };
  
  // Função para formatar telefone enquanto digita
  const formatarTelefone = (value: string) => {
    // Remover caracteres não numéricos
    const numeros = value.replace(/\D/g, '');
    
    // Verificar se tem pelo menos 10 dígitos (DDD + número)
    if (numeros.length >= 10) {
      // Formatar como (XX) XXXXX-XXXX para celular ou (XX) XXXX-XXXX para fixo
      if (numeros.length === 11) {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7, 11)}`;
      } else {
        return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6, 10)}`;
      }
    }
    
    return value;
  };
  
  // Função para lidar com mudança no telefone com máscara
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatarTelefone(e.target.value);
    setFormData({
      ...formData,
      telefone: formattedValue
    });
  };
  
  // Função para validar o formulário
  const validarFormulario = () => {
    // Verificar nome
    if (!formData.nome.trim()) {
      setError('O nome é obrigatório');
      return false;
    }
    
    // Verificar telefone
    const telefoneNumeros = formData.telefone.replace(/\D/g, '');
    if (!telefoneNumeros || telefoneNumeros.length < 10) {
      setError('Telefone inválido. Insira DDD + número');
      return false;
    }
    
    // Verificar email (se fornecido)
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Email inválido');
      return false;
    }
    
    setError(null);
    return true;
  };
  
  // Função para salvar contato
  const salvarContato = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Formatar telefone para validação
      const telefoneNumeros = formData.telefone.replace(/\D/g, '');
      
      // Verificar se o telefone atende ao padrão esperado pela API
      if (telefoneNumeros.length < 10 || telefoneNumeros.length > 11) {
        throw new Error('O telefone deve ter 10 ou 11 dígitos (incluindo DDD)');
      }
      
      // Preparar dados para API
      const dadosContato = {
        nome: formData.nome.trim(),
        telefone: telefoneNumeros,
        email: formData.email && formData.email.trim() ? formData.email.trim() : undefined,
        grupos: [formData.grupo],
        tags: tags.length > 0 ? tags : [],
        observacoes: formData.observacoes && formData.observacoes.trim() ? formData.observacoes.trim() : undefined
      };
      
      console.log('Enviando dados para API:', dadosContato);
      
      // Enviar para API
      const response = await fetch('/api/contatos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosContato)
      });
      
      let data;
      try {
        data = await response.json();
        console.log('Resposta da API:', data);
      } catch (jsonError) {
        console.error('Erro ao processar resposta JSON:', jsonError);
        const textoResposta = await response.text();
        console.error('Resposta recebida (texto):', textoResposta.substring(0, 500));
        throw new Error('Erro ao processar resposta do servidor. Verifique o console para detalhes.');
      }
      
      if (!response.ok) {
        console.error('Resposta da API com erro:', data);
        throw new Error(data?.message || `Erro ao criar contato (${response.status})`);
      }
      
      // Se sucesso, redirecionar para lista de contatos
      alert('Contato criado com sucesso!');
      router.push('/contatos');
      
    } catch (err) {
      console.error('Erro detalhado ao criar contato:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar contato');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <DashboardLayout pageTitle="Novo Contato">
      <div className="max-w-3xl">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={salvarContato}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Nome completo"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone / WhatsApp*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiPhone className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="(00) 00000-0000"
                    required
                    value={formData.telefone}
                    onChange={handleTelefoneChange}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Formato: (00) 00000-0000
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiMail className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="grupo" className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiUserGroup className="text-gray-400" />
                  </div>
                  <select
                    id="grupo"
                    name="grupo"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={formData.grupo}
                    onChange={handleChange}
                  >
                    <option value="Geral">Geral</option>
                    <option value="Cliente">Cliente</option>
                    <option value="VIP">VIP</option>
                    <option value="Fornecedor">Fornecedor</option>
                    <option value="Parceiro">Parceiro</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiTag className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="tag"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Adicionar tag e pressionar Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyPress}
                  />
                </div>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                      <span>{tag}</span>
                      <button 
                        type="button" 
                        className="ml-1 text-blue-600 hover:text-blue-800"
                        onClick={() => removerTag(tag)}
                      >
                        <HiX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <button 
                      type="button"
                      className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full flex items-center hover:bg-gray-200"
                      onClick={adicionarTag}
                    >
                      <HiPlus className="h-3 w-3 mr-1" />
                      <span>Nova tag</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Informações adicionais sobre o contato..."
                value={formData.observacoes}
                onChange={handleChange}
              ></textarea>
            </div>
            
            <div className="border-t border-gray-200 pt-6 mt-6 flex justify-end space-x-3">
              <Link
                href="/contatos"
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className={`px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Contato'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <p className="flex items-start">
            <span className="font-medium mr-2">Dica:</span>
            <span>
              Você também pode importar contatos em massa usando nossa opção de importação de arquivo CSV ou XLS.
              <Link href="/contatos/importar" className="block mt-1 text-blue-600 hover:underline">
                Importar contatos em massa &rarr;
              </Link>
            </span>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
} 