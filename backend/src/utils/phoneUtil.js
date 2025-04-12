/**
 * Utilitário para manipulação de números de telefone
 */

/**
 * Normaliza um número de telefone removendo caracteres não numéricos
 * e adicionando prefixo do país se necessário
 * 
 * @param {string} phoneNumber - Número de telefone a ser normalizado
 * @returns {string} Número de telefone normalizado
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Remove todos os caracteres não numéricos
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Se já tiver código do país (começando com +), mantém como está
  if (phoneNumber.startsWith('+')) {
    return cleaned;
  }
  
  // Verifica se o número já começa com 55 (Brasil)
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }
  
  // Adiciona o código do país Brasil (55) se necessário
  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }
  
  // Se não se encaixar nos padrões acima, apenas retorna o que foi limpo
  return cleaned;
}

/**
 * Valida se um número de telefone está em formato válido para o Brasil
 * 
 * @param {string} phoneNumber - Número de telefone a ser validado
 * @returns {boolean} True se for válido, false caso contrário
 */
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Verifica se o número tem o tamanho correto para um número brasileiro (com código do país)
  // 55 + 10 dígitos (fixo) ou 55 + 11 dígitos (celular)
  return /^55\d{10,11}$/.test(normalized);
}

/**
 * Formata um número para o padrão E.164 (formato usado em APIs)
 * 
 * @param {string} phoneNumber - Número de telefone a ser formatado
 * @returns {string} Número no formato E.164 (+55XXXXXXXXXX)
 */
function formatToE164(phoneNumber) {
  if (!phoneNumber) return '';
  
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Adiciona o símbolo + no início se não estiver presente
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

module.exports = {
  normalizePhoneNumber,
  isValidPhoneNumber,
  formatToE164
}; 