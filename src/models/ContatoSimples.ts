import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface para Contato (document)
export interface IContato extends Document {
  nome: string;
  telefone: string;
  email?: string;
  grupos?: string[];
  tags?: string[];
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Schema para contatos (sem índices)
const ContatoSchema = new Schema({
  nome: { 
    type: String, 
    required: [true, 'Nome do contato é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  telefone: { 
    type: String, 
    required: [true, 'Telefone é obrigatório'],
    trim: true,
    match: [
      /^(\+?[1-9]\d{1,14}|\d{10,11})$/, 
      'Formato de telefone inválido. Use apenas números, com DDD (ex: 11999998888)'
    ]
  },
  email: { 
    type: String, 
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  grupos: [String],
  tags: [String],
  observacoes: { 
    type: String,
    trim: true,
    maxlength: [500, 'Observações devem ter no máximo 500 caracteres']
  },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now }
}, {
  timestamps: { 
    createdAt: 'criadoEm', 
    updatedAt: 'atualizadoEm' 
  }
});

// Sem configuração de índices

// Modelo com nome diferente para evitar colisão
let ContatoSimplesModel: Model<IContato>;

try {
  // Tenta usar modelo existente ou cria um novo, mas com um nome diferente
  ContatoSimplesModel = mongoose.model<IContato>('ContatoSimples');
} catch (error) {
  ContatoSimplesModel = mongoose.model<IContato>('ContatoSimples', ContatoSchema);
}

export default ContatoSimplesModel; 