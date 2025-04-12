const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  mediaUrl: {
    type: String,
    trim: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', null],
    default: null
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Atualizando o campo updatedAt antes de salvar
MessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Message', MessageSchema); 