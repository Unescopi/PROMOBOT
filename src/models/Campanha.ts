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

// Schema principal para campanhas
const CampanhaSchema = new Schema({
  nome: { 
    type: String, 
    required: [true, 'Nome da campanha é obrigatório'],
    trim: true,
    maxlength: [200, 'Nome deve ter no máximo 200 caracteres']
  },
  mensagem: { 
    type: String, 
    required: [true, 'Mensagem é obrigatória'],
    trim: true
  },
  tipo: { 
    type: String, 
    enum: ['texto', 'imagem', 'video', 'documento'], 
    default: 'texto'
  },
  agendamento: { 
    type: Date
  },
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'], 
    default: 'draft'
  },
  destinatarios: [String],
  mediaUrl: String,
  mediaType: String,
  estatisticas: {
    type: EstatisticasSchema,
    default: () => ({
      total: 0,
      enviadas: 0,
      entregues: 0,
      lidas: 0,
      respondidas: 0,
      falhas: 0
    })
  },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now }
}, {
  timestamps: { 
    createdAt: 'criadoEm', 
    updatedAt: 'atualizadoEm' 
  }
});

// Verifica se o modelo já existe para evitar recompilação durante hot-reload
export default mongoose.models.Campanha || 
  mongoose.model<ICampanha>('Campanha', CampanhaSchema); 