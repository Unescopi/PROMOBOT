const mongoose = require('mongoose');

const MessageStatusSchema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  evolutionApiMessageId: {
    type: String
  },
  failReason: {
    type: String
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  readAt: {
    type: Date
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
MessageStatusSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MessageStatus', MessageStatusSchema); 