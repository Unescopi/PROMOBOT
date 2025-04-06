import { connectToDatabase } from '@/lib/mongodb';
import ConfiguracaoModel, { IConfiguracao } from '@/models/Configuracao';

/**
 * Serviço para gerenciar acesso às configurações do sistema
 */

/**
 * Obtém as configurações atuais do sistema
 * @returns As configurações do sistema ou null se não existirem
 */
export async function getConfiguracao(): Promise<IConfiguracao | null> {
  try {
    // Conectar ao banco de dados
    await connectToDatabase();
    
    // Buscar configurações
    const configuracao = await ConfiguracaoModel.findOne({});
    
    return configuracao;
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    return null;
  }
}

/**
 * Obtém um valor específico de configuração
 * @param key A chave da configuração desejada
 * @param defaultValue Valor padrão caso a configuração não exista
 * @returns O valor da configuração ou o valor padrão
 */
export async function getConfigValue<T>(key: keyof IConfiguracao, defaultValue: T): Promise<T> {
  try {
    const config = await getConfiguracao();
    
    if (!config || config[key] === undefined) {
      return defaultValue;
    }
    
    return config[key] as unknown as T;
  } catch (error) {
    console.error(`Erro ao obter valor de configuração para ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Atualiza configurações no banco de dados
 * @param data Dados de configuração a serem atualizados
 * @returns As configurações atualizadas ou null em caso de erro
 */
export async function updateConfiguracao(data: Partial<IConfiguracao>): Promise<IConfiguracao | null> {
  try {
    // Conectar ao banco de dados
    await connectToDatabase();
    
    // Buscar configuração atual ou criar nova
    let configuracao = await ConfiguracaoModel.findOne({});
    
    if (configuracao) {
      // Atualizar configuração existente
      configuracao = await ConfiguracaoModel.findOneAndUpdate(
        {}, 
        { $set: data },
        { new: true, runValidators: true }
      );
    } else {
      // Criar nova configuração
      configuracao = await ConfiguracaoModel.create(data);
    }
    
    return configuracao;
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return null;
  }
}

/**
 * Obtém valores relacionados ao webhook
 * @returns Objeto com URL e segredo do webhook
 */
export async function getWebhookConfig(): Promise<{
  url: string;
  secret: string;
}> {
  const config = await getConfiguracao();
  
  return {
    url: config?.webhookUrl || process.env.WEBHOOK_URL || '',
    secret: config?.webhookSegredo || process.env.WEBHOOK_SECRET || ''
  };
} 