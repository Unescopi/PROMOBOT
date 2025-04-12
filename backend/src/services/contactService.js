const Contact = require('../models/Contact');
// Utilitário para normalização de números de telefone
const phoneUtil = require('../utils/phoneUtil');

class ContactService {
  /**
   * Normaliza um número de telefone para o formato padrão
   * @param {string} phoneNumber - Número de telefone a ser normalizado
   * @returns {string} Número de telefone normalizado
   */
  normalize(phoneNumber) {
    return phoneUtil.normalizePhoneNumber(phoneNumber);
  }

  /**
   * Valida se um número de telefone está em formato válido
   * @param {string} phoneNumber - Número de telefone a ser validado
   * @returns {boolean} True se for válido, false caso contrário
   */
  isValid(phoneNumber) {
    return phoneUtil.isValidPhoneNumber(phoneNumber);
  }

  /**
   * Formata um número para o padrão E.164 (formato usado em APIs)
   * @param {string} phoneNumber - Número de telefone a ser formatado
   * @returns {string} Número no formato E.164 (+55XXXXXXXXXX)
   */
  formatToE164(phoneNumber) {
    return phoneUtil.formatToE164(phoneNumber);
  }

  /**
   * Cria um novo contato
   * @param {Object} contactData - Dados do contato
   * @returns {Promise<Object>} Contato criado
   */
  async createContact(contactData) {
    try {
      // Garantir compatibilidade entre phoneNumber e phone
      // (o banco de dados tem índice único em 'phone', mas o modelo usa 'phoneNumber')
      const normalizedData = { ...contactData };
      
      // Se temos phoneNumber, copiar para phone também
      if (normalizedData.phoneNumber) {
        normalizedData.phone = normalizedData.phoneNumber;
      }
      // Se temos phone, copiar para phoneNumber também
      else if (normalizedData.phone) {
        normalizedData.phoneNumber = normalizedData.phone;
      }
      
      const contact = new Contact(normalizedData);
      await contact.save();
      return contact;
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      throw error;
    }
  }

  /**
   * Cria múltiplos contatos
   * @param {Array} contactsData - Array com dados dos contatos
   * @returns {Promise<Object>} Resultado da operação
   */
  async createMultipleContacts(contactsData) {
    try {
      // Normalizar cada contato para garantir compatibilidade phone/phoneNumber
      const normalizedContacts = contactsData.map(contact => {
        const normalized = { ...contact };
        // Se temos phoneNumber, copiar para phone também
        if (normalized.phoneNumber) {
          normalized.phone = normalized.phoneNumber;
        }
        // Se temos phone, copiar para phoneNumber também
        else if (normalized.phone) {
          normalized.phoneNumber = normalized.phone;
        }
        return normalized;
      });

      // Filtrar números duplicados dentro do array recebido
      const uniquePhoneNumbers = new Set();
      const uniqueContacts = normalizedContacts.filter(contact => {
        const phoneKey = contact.phoneNumber || contact.phone;
        if (!phoneKey || uniquePhoneNumbers.has(phoneKey)) {
          return false;
        }
        uniquePhoneNumbers.add(phoneKey);
        return true;
      });
      
      // Verificar quais números já existem no banco
      const existingPhoneNumbers = await Contact.find({
        phoneNumber: { $in: Array.from(uniquePhoneNumbers) }
      }).select('phoneNumber');
      
      const existingSet = new Set(existingPhoneNumbers.map(c => c.phoneNumber));
      
      // Filtrar apenas os números que não existem
      const newContacts = uniqueContacts.filter(contact => 
        !existingSet.has(contact.phoneNumber)
      );
      
      // Inserir os novos contatos
      let insertedCount = 0;
      if (newContacts.length > 0) {
        const result = await Contact.insertMany(newContacts);
        insertedCount = result.length;
      }
      
      return {
        success: true,
        message: `${insertedCount} contatos adicionados, ${existingSet.size} ignorados (já existem)`,
        totalReceived: contactsData.length,
        inserted: insertedCount,
        duplicatesIgnored: uniquePhoneNumbers.size - newContacts.length,
        alreadyExisting: existingSet.size
      };
    } catch (error) {
      console.error('Erro ao criar múltiplos contatos:', error);
      throw error;
    }
  }

  /**
   * Obtém todos os contatos
   * @param {Object} filterParams - Parâmetros de filtro da requisição
   * @param {number} limit - Limite de resultados
   * @param {number} skip - Quantidade de registros a pular
   * @returns {Promise<Array>} Lista de contatos
   */
  async getContacts(filterParams = {}, limit = 50, skip = 0) {
    try {
      console.log('Parâmetros da requisição:', filterParams);
      
      // Construir o filtro de consulta
      const filter = {};
      
      // Se tiver parâmetro de busca, buscar por nome, email ou telefone
      if (filterParams.search) {
        const searchRegex = new RegExp(filterParams.search, 'i');
        filter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex },
          { phone: searchRegex }
        ];
      }
      
      // Filtro por tags
      if (filterParams.tag) {
        filter.tags = { $in: [filterParams.tag] };
      }
      
      // Filtro por status
      if (filterParams.status) {
        filter.active = filterParams.status === 'active';
      }
      
      // Outras conversões de parâmetros
      // Se tiver page, ajustar o skip para a página correta
      if (filterParams.page && !skip) {
        // Se o frontend enviou page, calcular o skip (ajustando para base 0)
        const page = parseInt(filterParams.page, 10);
        skip = (page - 1) * limit;
      }
      
      console.log('Filtro gerado:', filter);
      console.log('Limit:', limit, 'Skip:', skip);
      
      // Definir ordenação (padrão: createdAt decrescente)
      const sortField = filterParams.sortBy || 'createdAt';
      const sortDirection = filterParams.direction === 'asc' ? 1 : -1;
      const sort = { [sortField]: sortDirection };
      
      // Fazer a consulta
      const contacts = await Contact.find(filter)
        .sort(sort)
        .limit(limit)
        .skip(skip);
      
      const total = await Contact.countDocuments(filter);
      
      console.log(`Encontrados ${contacts.length} contatos de ${total} total`);
      
      // Retornar no formato esperado pelo frontend
      return {
        success: true,
        contacts,
        total,
        pagination: {
          total,
          limit,
          skip,
          page: skip / limit + 1,
          pages: Math.ceil(total / limit),
          hasMore: skip + contacts.length < total
        }
      };
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      throw error;
    }
  }

  /**
   * Obtém um contato pelo ID
   * @param {string} id - ID do contato
   * @returns {Promise<Object>} Contato encontrado
   */
  async getContactById(id) {
    try {
      return await Contact.findById(id);
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
      throw error;
    }
  }

  /**
   * Atualiza um contato existente
   * @param {string} id - ID do contato
   * @param {Object} updateData - Dados para atualização
   * @returns {Promise<Object>} Contato atualizado
   */
  async updateContact(id, updateData) {
    try {
      return await Contact.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      throw error;
    }
  }

  /**
   * Remove um contato
   * @param {string} id - ID do contato
   * @returns {Promise<Object>} Resultado da operação
   */
  async deleteContact(id) {
    try {
      await Contact.findByIdAndDelete(id);
      return { success: true, message: 'Contato removido com sucesso' };
    } catch (error) {
      console.error('Erro ao remover contato:', error);
      throw error;
    }
  }

  /**
   * Busca contatos por tags
   * @param {Array} tags - Array de tags para filtrar
   * @returns {Promise<Array>} Contatos encontrados
   */
  async getContactsByTags(tags) {
    try {
      return await Contact.find({
        tags: { $in: tags },
        active: true
      });
    } catch (error) {
      console.error('Erro ao buscar contatos por tags:', error);
      throw error;
    }
  }

  /**
   * Importa contatos de um arquivo CSV
   * @param {Buffer} fileBuffer - Buffer do arquivo CSV
   * @returns {Promise<Object>} Resultado da importação
   */
  async importContactsFromCSV(fileBuffer) {
    try {
      // Converter o buffer para string
      const csvString = fileBuffer.toString('utf-8');
      
      // Quebrar o CSV em linhas
      const lines = csvString.split('\n').filter(line => line.trim());
      
      // Assumindo que a primeira linha é o cabeçalho
      const headers = lines[0].split(',').map(header => header.trim());
      
      // Validar cabeçalho (pelo menos nome e telefone)
      const nameIndex = headers.findIndex(h => 
        h.toLowerCase() === 'nome' || h.toLowerCase() === 'name');
      const phoneIndex = headers.findIndex(h => 
        h.toLowerCase() === 'telefone' || h.toLowerCase() === 'phone' || h.toLowerCase() === 'celular');
      
      if (nameIndex === -1 || phoneIndex === -1) {
        throw new Error('Formato de CSV inválido. É necessário ter colunas de nome e telefone.');
      }
      
      // Extrair tags se existirem
      const tagsIndex = headers.findIndex(h => 
        h.toLowerCase() === 'tags' || h.toLowerCase() === 'categorias');
      
      // Extrair email se existir
      const emailIndex = headers.findIndex(h => 
        h.toLowerCase() === 'email' || h.toLowerCase() === 'e-mail');
      
      // Preparar os contatos para importação
      const contacts = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        
        if (values.length < Math.max(nameIndex, phoneIndex) + 1) {
          continue; // Linha inválida, pular
        }
        
        const contact = {
          name: values[nameIndex],
          phoneNumber: values[phoneIndex],
          active: true
        };
        
        // Adicionar email se existir
        if (emailIndex !== -1 && values[emailIndex]) {
          contact.email = values[emailIndex];
        }
        
        // Adicionar tags se existirem
        if (tagsIndex !== -1 && values[tagsIndex]) {
          contact.tags = values[tagsIndex].split(';').map(tag => tag.trim());
        }
        
        contacts.push(contact);
      }
      
      // Usar o método de criação múltipla
      return await this.createMultipleContacts(contacts);
    } catch (error) {
      console.error('Erro ao importar contatos do CSV:', error);
      throw error;
    }
  }
}

module.exports = new ContactService(); 