import mongoose, { Schema, Document } from 'mongoose';

// Interface para Configuração (document)
export interface IConfiguracao extends Document {
  // Geral
  nomeEmpresa: string;
  timezone: string;
  lingua: string;
  
  // WhatsApp
  whatsappNumber: string;
  evolutionApiUrl?: string;
  apiKey?: string;
  
  // Mensagens
  assinatura: string;
  maxMensagensDia: number;
  intervaloEnvios: number;
  
  // Agendamentos
  intervaloProcessamento: number;
  horarioInicio: string;
  horarioFim: string;
  
  // API
  webhookUrl: string;
  apiKeyExternal: string;
  webhookSegredo?: string;
  
  // Segurança
  ipPermitidos: string[];
  
  // Timestamps
  atualizadoEm: Date;
}

// Schema para configurações
const ConfiguracaoSchema = new Schema({
  // Geral
  nomeEmpresa: { 
    type: String, 
    required: [true, 'Nome da empresa é obrigatório'],
    trim: true
  },
  timezone: {
    type: String,
    default: 'America/Sao_Paulo',
    trim: true
  },
  lingua: {
    type: String,
    default: 'pt_BR',
    trim: true
  },
  
  // WhatsApp
  whatsappNumber: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Formato de telefone inválido. Use formato internacional (ex: +551199998888)'
    }
  },
  evolutionApiUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/\S+$/.test(v);
      },
      message: 'URL da Evolution API inválida'
    }
  },
  apiKey: { 
    type: String,
    trim: true
  },
  
  // Mensagens
  assinatura: { 
    type: String,
    default: '',
    trim: true
  },
  maxMensagensDia: { 
    type: Number,
    default: 1000,
    min: [1, 'Número máximo de mensagens deve ser pelo menos 1']
  },
  intervaloEnvios: { 
    type: Number,
    default: 2000,
    min: [500, 'Intervalo deve ser no mínimo 500 milissegundos'],
    max: [60000, 'Intervalo deve ser no máximo 1 minuto']
  },
  
  // Agendamentos
  intervaloProcessamento: {
    type: Number,
    default: 5,
    min: [1, 'Intervalo de processamento deve ser no mínimo 1 minuto'],
    max: [60, 'Intervalo de processamento deve ser no máximo 60 minutos']
  },
  horarioInicio: {
    type: String,
    default: '08:00',
    validate: {
      validator: function(v: string) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Formato de hora inválido. Use formato HH:MM (24h)'
    }
  },
  horarioFim: {
    type: String,
    default: '20:00',
    validate: {
      validator: function(v: string) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Formato de hora inválido. Use formato HH:MM (24h)'
    }
  },
  
  // API
  webhookUrl: { 
    type: String,
    default: '',
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/\S+$/.test(v);
      },
      message: 'URL de webhook inválida'
    }
  },
  apiKeyExternal: { 
    type: String,
    default: '',
    trim: true
  },
  webhookSegredo: {
    type: String,
    default: '',
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^[A-Za-z0-9_]+$/.test(v);
      },
      message: 'Segredo do webhook contém caracteres inválidos'
    }
  },
  
  // Segurança
  ipPermitidos: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        if (!v.length) return true;
        // Validação básica de formato IP
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return v.every(ip => ipRegex.test(ip));
      },
      message: 'Um ou mais endereços IP estão em formato inválido'
    }
  },
  
  // Timestamp
  atualizadoEm: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { 
    createdAt: false, 
    updatedAt: 'atualizadoEm' 
  },
  // Permitir campos não definidos explicitamente no schema
  strict: false
});

// Verifica se o modelo já existe para evitar recompilação durante hot-reload
export default mongoose.models.Configuracao || 
  mongoose.model<IConfiguracao>('Configuracao', ConfiguracaoSchema); 