const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 
      'logout', 
      'register', 
      'update_profile', 
      'update_password',
      'create_user', 
      'update_user', 
      'delete_user',
      'create_campaign',
      'update_campaign',
      'delete_campaign',
      'start_campaign',
      'pause_campaign',
      'send_message',
      'create_contact',
      'update_contact',
      'delete_contact',
      'import_contacts',
      'create_segment',
      'other'
    ]
  },
  entity: {
    type: String,
    enum: ['user', 'contact', 'message', 'campaign', 'group', 'segment', 'system', 'other'],
    default: 'system'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para melhorar a performance das consultas
LogSchema.index({ user: 1 });
LogSchema.index({ action: 1 });
LogSchema.index({ entity: 1 });
LogSchema.index({ createdAt: -1 });
LogSchema.index({ entityId: 1 });

module.exports = mongoose.model('Log', LogSchema); 