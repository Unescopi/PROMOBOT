import mongoose, { Schema, Document } from 'mongoose';

// Interface para estatísticas de campanha
interface EstatisticasCampanha {
  total: number;
  enviadas: number;
  entregues: number;
  lidas: number;
  respondidas: number;
  falhas: number;
}

// Interface para Campanha (document)
export interface ICampanha extends Document {
  nome: string;
  mensagem: string;
  tipo: 'texto' | 'imagem' | 'video' | 'documento';
  agendamento?: Date;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  destinatarios: string[];
  mediaUrl?: string;
  mediaType?: string;
  estatisticas: EstatisticasCampanha;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Schema para estatísticas
const EstatisticasSchema = new Schema({
  total: { type: Number, default: 0 },
  enviadas: { type: Number, default: 0 },
  entregues: { type: Number, default: 0 },
  lidas: { type: Number, default: 0 },
  respondidas: { type: Number, default: 0 },
  falhas: { type: Number, default: 0 }
});

// Schema para campanhas
const CampanhaSchema = new Schema({
  nome: { 
    type: String, 
    required: true 
  },
  mensagem: { 
    type: String, 
    required: true 
  },
  tipo: { 
    type: String, 
    enum: ['texto', 'imagem', 'video', 'documento'],
    default: 'texto'
  },
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  agendamento: { 
    type: Date 
  },
  destinatarios: { 
    type: [String],
    default: []
  },
  mediaUrl: { 
    type: String 
  },
  estatisticas: {
    total: { type: Number, default: 0 },
    enviadas: { type: Number, default: 0 },
    entregues: { type: Number, default: 0 },
    lidas: { type: Number, default: 0 },
    respondidas: { type: Number, default: 0 },
    falhas: { type: Number, default: 0 }
  }
}, {
  timestamps: { 
    createdAt: 'criadoEm', 
    updatedAt: 'atualizadoEm' 
  }
});

// Middleware para garantir que as datas sejam salvas corretamente
CampanhaSchema.pre('save', function(this: any, next) {
  // Log para depuração
  console.log('Salvando campanha com timestamp atual:', new Date().toISOString());
  console.log('Timestamp atual em ms:', Date.now());
  
  // Garantir que criadoEm seja definido se for um novo documento
  if (this.isNew && !this.criadoEm) {
    this.criadoEm = new Date();
    console.log('Nova campanha, definindo criadoEm:', this.criadoEm.toISOString());
  }
  
  // Atualizar atualizadoEm sempre
  this.atualizadoEm = new Date();
  console.log('Atualizando atualizadoEm:', this.atualizadoEm.toISOString());
  
  next();
});

// Verifica se o modelo já existe para evitar recompilação durante hot-reload
export default mongoose.models.Campanha || 
  mongoose.model<ICampanha>('Campanha', CampanhaSchema); 