const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  api: {
    apiKey: {
      type: String,
      required: true
    },
    baseUrl: {
      type: String,
      required: true,
      default: 'https://api.evolution-api.com'
    },
    instanceName: {
      type: String,
      required: true,
      default: 'promobot'
    },
    webhookUrl: {
      type: String
    }
  },
  messages: {
    defaultDelay: {
      type: Number,
      default: 3,
      min: 1,
      max: 60
    },
    maxMessagesPerMinute: {
      type: Number,
      default: 20,
      min: 1,
      max: 100
    },
    enableReadReceipts: {
      type: Boolean,
      default: true
    },
    enableTypingIndicator: {
      type: Boolean,
      default: true
    }
  },
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    emailAddress: {
      type: String,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor, forneça um e-mail válido'
      ]
    },
    notifyOnError: {
      type: Boolean,
      default: true
    },
    notifyOnCompletion: {
      type: Boolean,
      default: true
    },
    dailyReports: {
      type: Boolean,
      default: true
    }
  },
  system: {
    language: {
      type: String,
      default: 'pt-BR',
      enum: ['pt-BR', 'en-US', 'es']
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
    },
    timeFormat: {
      type: String,
      default: '24h',
      enum: ['24h', '12h']
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark', 'system']
    }
  }
}, {
  timestamps: true
});

// Garantir que só existe um documento de configurações
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema); 