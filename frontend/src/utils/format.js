/**
 * Utilitários para formatação de dados
 */

/**
 * Formata um número de telefone para o formato brasileiro
 * @param {string} phone - Número de telefone (com ou sem formatação)
 * @returns {string} Número formatado (ex: (11) 98765-4321)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Verifica se é um número brasileiro (com ou sem código do país)
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    // Número com código do país (55) e DDD
    const ddd = cleaned.substring(2, 4);
    const part1 = cleaned.substring(4, 9);
    const part2 = cleaned.substring(9, 13);
    return `(${ddd}) ${part1}-${part2}`;
  } else if (cleaned.length === 11) {
    // Número com DDD sem código do país
    const ddd = cleaned.substring(0, 2);
    const part1 = cleaned.substring(2, 7);
    const part2 = cleaned.substring(7, 11);
    return `(${ddd}) ${part1}-${part2}`;
  } else if (cleaned.length === 10) {
    // Número com DDD sem 9 à frente
    const ddd = cleaned.substring(0, 2);
    const part1 = cleaned.substring(2, 6);
    const part2 = cleaned.substring(6, 10);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  // Retorna o número limpo se não encaixar nos formatos acima
  return cleaned;
};

/**
 * Formata uma data para o formato brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @param {boolean} includeTime - Se deve incluir a hora
 * @returns {string} Data formatada (ex: 31/12/2023 23:59)
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  let formatted = `${day}/${month}/${year}`;
  
  if (includeTime) {
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    formatted += ` ${hours}:${minutes}`;
  }
  
  return formatted;
};

/**
 * Formata um valor monetário para o formato brasileiro
 * @param {number} value - Valor a ser formatado
 * @param {boolean} showSymbol - Se deve mostrar o símbolo da moeda
 * @returns {string} Valor formatado (ex: R$ 1.234,56)
 */
export const formatCurrency = (value, showSymbol = true) => {
  if (value === null || value === undefined) return '';
  
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(value);
};

/**
 * Formata um número grande com sufixos (K, M, B)
 * @param {number} num - Número a ser formatado
 * @returns {string} Número formatado (ex: 1.2K, 3.4M)
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  
  if (num < 1000) {
    return num.toString();
  }
  
  const si = [
    { value: 1E9, symbol: 'B' },
    { value: 1E6, symbol: 'M' },
    { value: 1E3, symbol: 'K' }
  ];
  
  for (let i = 0; i < si.length; i++) {
    if (num >= si[i].value) {
      return (num / si[i].value).toFixed(1).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + si[i].symbol;
    }
  }
  
  return num.toString();
};

/**
 * Trunca um texto longo e adiciona reticências
 * @param {string} text - Texto a ser truncado
 * @param {number} maxLength - Tamanho máximo
 * @returns {string} Texto truncado
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
};

/**
 * Formata um nome para mostrar as iniciais
 * @param {string} name - Nome completo
 * @returns {string} Iniciais (ex: JD para John Doe)
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Formata um nome para capitalizar as primeiras letras
 * @param {string} name - Nome completo
 * @returns {string} Nome capitalizado
 */
export const capitalizeNames = (name) => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length <= 2) return word; // Não capitaliza artigos e preposições
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Formata uma data para o formato brasileiro usando a API Intl
 * @param {string} dateString - String de data para formatar
 * @returns {string} - Data formatada
 */
export const formatDateBR = (dateString) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

/**
 * Formata uma data e hora para o formato brasileiro
 * @param {string} dateString - String de data para formatar
 * @returns {string} - Data e hora formatadas
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Formata um número de telefone para exibição
 * @param {string} phone - Número de telefone
 * @returns {string} - Número formatado
 */
export const formatPhone = (phone) => {
  if (!phone) return '-';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.toString().replace(/\D/g, '');
  
  if (cleaned.length === 0) return '-';
  
  // Números internacionais (não brasileiros)
  if (!cleaned.startsWith('55') && cleaned.length > 10) {
    // Para números internacionais, manter o código do país separado
    // E.g., +1 123 456 7890
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
  }
  
  // Formatos brasileiros
  // Com código de país (55)
  if (cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const rest = cleaned.substring(4);
    
    // Celular (9 dígitos)
    if (rest.length === 9) {
      return `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
    }
    // Fixo (8 dígitos)
    else if (rest.length === 8) {
      return `(${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    // Outro formato, manter legível
    else {
      return `+55 ${ddd} ${rest}`;
    }
  }
  
  // Apenas com DDD (sem código de país)
  if (cleaned.length === 10 || cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const rest = cleaned.substring(2);
    
    // Celular (9 dígitos)
    if (rest.length === 9) {
      return `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
    }
    // Fixo (8 dígitos)
    else if (rest.length === 8) {
      return `(${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
  }
  
  // Apenas número local (sem DDD nem código de país)
  if (cleaned.length === 8 || cleaned.length === 9) {
    if (cleaned.length === 9) {
      return `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
    } else {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4)}`;
    }
  }
  
  // Formato desconhecido, retornar o número limpo agrupado para legibilidade
  return cleaned;
}; 