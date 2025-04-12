/**
 * Utilitário para verificar a disponibilidade do Redis e diagnosticar problemas
 */
const redis = require('redis');
require('dotenv').config();

/**
 * Testa a conexão com o Redis
 * @returns {Promise<Object>} Resultado do teste
 */
async function checkRedisConnection() {
  // Configurações do Redis
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PASSWORD;
  const url = process.env.REDIS_URL;
  
  const options = {
    socket: {
      host,
      port,
      connectTimeout: 5000, // 5 segundos
      reconnectStrategy: false // Não tenta reconectar automaticamente
    }
  };
  
  if (password) {
    options.password = password;
  }
  
  // Se tiver URL definida, usa ela em vez das configurações separadas
  const client = url 
    ? redis.createClient({ url, ...options })
    : redis.createClient(options);
  
  // Configurar handler de erro
  client.on('error', (err) => {
    console.error('Erro de conexão com Redis:', err.message);
  });

  try {
    // Tenta conectar
    await client.connect();
    
    // Teste básico de funcionamento
    await client.set('promobot:test', 'connection-test');
    const testValue = await client.get('promobot:test');
    
    // Obter informações do servidor
    const info = await client.info();
    
    // Analisar informações
    const sections = {};
    let currentSection = '';
    
    info.split('\n').forEach(line => {
      // Verificar linha de seção
      if (line.startsWith('# ')) {
        currentSection = line.substring(2);
        sections[currentSection] = {};
      } 
      // Verificar linha de dados
      else if (line.includes(':') && currentSection) {
        const [key, value] = line.split(':');
        if (key && value) {
          sections[currentSection][key.trim()] = value.trim();
        }
      }
    });
    
    // Obter estatísticas de memória
    const memory = sections.Memory || {};
    const used_memory_human = memory.used_memory_human || 'N/A';
    const maxmemory_human = memory.maxmemory_human || 'ilimitada';
    
    // Obter estatísticas de servidor
    const server = sections.Server || {};
    const redis_version = server.redis_version || 'N/A';
    const uptime_in_seconds = parseInt(server.uptime_in_seconds || '0');
    
    // Obter estatísticas de clientes
    const clients = sections.Clients || {};
    const connected_clients = parseInt(clients.connected_clients || '0');
    
    // Fechar conexão
    await client.disconnect();
    
    // Resultado
    return {
      success: true,
      connection: {
        host,
        port,
        hasPassword: !!password,
        url: url ? url.replace(/\/\/(.+?):(.+?)@/, '//***:***@') : null
      },
      test: {
        value: testValue,
        passed: testValue === 'connection-test'
      },
      stats: {
        version: redis_version,
        uptime: formatUptime(uptime_in_seconds),
        memory: {
          used: used_memory_human,
          max: maxmemory_human
        },
        clients: connected_clients
      }
    };
  } catch (error) {
    // Tentar fechar conexão em caso de erro
    try {
      await client.disconnect();
    } catch (e) {
      // Ignora erros ao desconectar
    }
    
    return {
      success: false,
      error: error.message,
      connection: {
        host,
        port,
        hasPassword: !!password,
        url: url ? url.replace(/\/\/(.+?):(.+?)@/, '//***:***@') : null
      },
      diagnosis: diagnoseRedisError(error)
    };
  }
}

/**
 * Formata o tempo de atividade em um formato legível
 * @param {number} seconds - Tempo em segundos
 * @returns {string} Tempo formatado
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hora${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minuto${minutes > 1 ? 's' : ''}`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds} segundo${remainingSeconds !== 1 ? 's' : ''}`);
  
  return parts.join(', ');
}

/**
 * Diagnostica problemas comuns de conexão com Redis
 * @param {Error} error - Erro capturado
 * @returns {Object} Diagnóstico
 */
function diagnoseRedisError(error) {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('econnrefused')) {
    return {
      problem: 'CONEXÃO RECUSADA',
      possibleCauses: [
        'O servidor Redis não está em execução',
        'O host ou porta estão incorretos',
        'Um firewall está bloqueando a conexão'
      ],
      suggestions: [
        'Verifique se o Redis está em execução com: redis-cli ping',
        'Confira as configurações de host e porta no arquivo .env',
        'Tente conectar localmente com: redis-cli -h ' + (process.env.REDIS_HOST || 'localhost')
      ]
    };
  }
  
  if (errorMessage.includes('auth') || errorMessage.includes('password')) {
    return {
      problem: 'AUTENTICAÇÃO FALHOU',
      possibleCauses: [
        'Senha incorreta ou não fornecida',
        'Redis configurado para exigir senha'
      ],
      suggestions: [
        'Verifique se a senha no arquivo .env está correta',
        'Se o Redis não utiliza senha, remova REDIS_PASSWORD do .env'
      ]
    };
  }
  
  if (errorMessage.includes('timeout')) {
    return {
      problem: 'TEMPO LIMITE EXCEDIDO',
      possibleCauses: [
        'O servidor Redis está sobrecarregado',
        'Problemas de rede entre o aplicativo e o Redis',
        'Configuração incorreta de rede'
      ],
      suggestions: [
        'Verifique a conectividade de rede',
        'Confirme se o endereço do Redis está correto',
        'Aumente o tempo limite de conexão'
      ]
    };
  }
  
  // Diagnóstico genérico para outros erros
  return {
    problem: 'ERRO DESCONHECIDO',
    possibleCauses: [
      'Configuração incorreta do Redis',
      'Problema na infraestrutura'
    ],
    suggestions: [
      'Verifique os logs do Redis',
      'Confirme se as configurações no arquivo .env estão corretas',
      'Teste a conexão manualmente com redis-cli'
    ],
    errorDetails: error.message
  };
}

module.exports = {
  checkRedisConnection
}; 