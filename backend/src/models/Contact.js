const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  // Usamos phoneNumber como campo primário conforme o resto da aplicação
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  // Campo phone para compatibilidade com código existente e índice único
  phone: {
    type: String,
    trim: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice composto para busca por tags
ContactSchema.index({ tags: 1 });

// Índice de texto para busca por nome, email e telefone
ContactSchema.index({ 
  name: 'text', 
  email: 'text', 
  phoneNumber: 'text', 
  phone: 'text',
  tags: 'text'
});

// Atualizando o campo updatedAt antes de salvar
ContactSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Garantir que phone e phoneNumber estão sincronizados
  if (this.phoneNumber && (!this.phone || this.phone !== this.phoneNumber)) {
    this.phone = this.phoneNumber;
  } else if (this.phone && (!this.phoneNumber || this.phoneNumber !== this.phone)) {
    this.phoneNumber = this.phone;
  }
  
  next();
});

// Middleware para operações de findOneAndUpdate
ContactSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Atualizar updatedAt
  if (!update.$set) {
    update.$set = {};
  }
  update.$set.updatedAt = Date.now();
  
  // Sincronizar phone e phoneNumber
  if (update.phoneNumber || update.$set.phoneNumber) {
    const phoneNumber = update.phoneNumber || update.$set.phoneNumber;
    if (!update.$set.phone || update.$set.phone !== phoneNumber) {
      update.$set.phone = phoneNumber;
    }
  } else if (update.phone || update.$set.phone) {
    const phone = update.phone || update.$set.phone;
    if (!update.$set.phoneNumber || update.$set.phoneNumber !== phone) {
      update.$set.phoneNumber = phone;
    }
  }
  
  next();
});

module.exports = mongoose.model('Contact', ContactSchema); 