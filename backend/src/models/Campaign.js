const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'O nome da campanha é obrigatório'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: [true, 'A mensagem é obrigatória']
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'processing', 'completed', 'paused', 'canceled', 'failed'],
    default: 'draft'
  },
  scheduledDate: {
    type: Date,
    // A data de agendamento não é obrigatória, mas se fornecida deve ser válida
    validate: {
      validator: function(v) {
        // Se a data for fornecida, deve ser válida
        if (v !== undefined && v !== null) {
          return v instanceof Date && !isNaN(v);
        }
        // Se não for fornecida, é válida apenas se sendNow for true ou isRecurring for true
        return this.sendNow === true || this.isRecurring === true;
      },
      message: props => 'A data de agendamento é obrigatória para campanhas não recorrentes quando não marcadas para envio imediato'
    }
  },
  // Campo explícito para campanhas que devem ser enviadas imediatamente
  sendNow: {
    type: Boolean,
    default: false
  },
  sendToAll: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringType: {
    type: String,
    enum: [null, 'daily', 'weekly', 'monthly'],
    default: null,
    validate: {
      validator: function(v) {
        // O tipo de recorrência só é obrigatório se a campanha for recorrente
        return !this.isRecurring || (this.isRecurring && v);
      },
      message: props => 'O tipo de recorrência é obrigatório para campanhas recorrentes'
    }
  },
  recurringDays: {
    type: [Number],
    default: []
  },
  recurringHour: {
    type: Number,
    min: 0,
    max: 23,
    default: 12
  },
  recurringMinute: {
    type: Number,
    min: 0,
    max: 59,
    default: 0
  },
  recurringStartDate: {
    type: Date
  },
  recurringEndDate: {
    type: Date
  },
  allowedTimeStart: {
    type: Number,
    min: 0,
    max: 23,
    default: 8
  },
  allowedTimeEnd: {
    type: Number,
    min: 0,
    max: 23,
    default: 20
  },
  allowedDaysOfWeek: {
    type: [Number],
    default: [1, 2, 3, 4, 5]
  },
  lastRunDate: {
    type: Date
  },
  nextRunDate: {
    type: Date
  },
  statistics: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
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

CampaignSchema.methods.calculateNextRunDate = function() {
  if (!this.isRecurring || !this.recurringType) {
    return null;
  }
  
  let nextDate = new Date();
  
  if (this.lastRunDate) {
    nextDate = new Date(this.lastRunDate);
  } else if (this.recurringStartDate && this.recurringStartDate > nextDate) {
    nextDate = new Date(this.recurringStartDate);
  }
  
  nextDate.setHours(this.recurringHour || 12);
  nextDate.setMinutes(this.recurringMinute || 0);
  nextDate.setSeconds(0);
  nextDate.setMilliseconds(0);
  
  const today = new Date();
  if (
    this.lastRunDate && 
    nextDate.getDate() === today.getDate() && 
    nextDate.getMonth() === today.getMonth() && 
    nextDate.getFullYear() === today.getFullYear()
  ) {
    if (this.recurringType === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (this.recurringType === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (this.recurringType === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
  }
  
  if (this.recurringType === 'weekly' && this.recurringDays && this.recurringDays.length > 0) {
    let daysChecked = 0;
    let found = false;
    
    while (!found && daysChecked < 7) {
      const dayOfWeek = nextDate.getDay();
      if (this.recurringDays.includes(dayOfWeek)) {
        found = true;
      } else {
        nextDate.setDate(nextDate.getDate() + 1);
        daysChecked++;
      }
    }
    
    if (!found) {
      return null;
    }
  }
  
  if (this.recurringType === 'monthly' && this.recurringDays && this.recurringDays.length > 0) {
    const currentDay = nextDate.getDate();
    
    let foundDay = this.recurringDays.find(day => day >= currentDay);
    
    if (foundDay) {
      nextDate.setDate(foundDay);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(this.recurringDays[0] || 1);
    }
  }
  
  if (this.recurringEndDate && nextDate > this.recurringEndDate) {
    return null;
  }
  
  const hour = nextDate.getHours();
  if (hour < this.allowedTimeStart || hour > this.allowedTimeEnd) {
    if (hour < this.allowedTimeStart) {
      nextDate.setHours(this.allowedTimeStart);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(this.allowedTimeStart);
    }
  }
  
  const dayOfWeek = nextDate.getDay();
  if (this.allowedDaysOfWeek && this.allowedDaysOfWeek.length > 0 && !this.allowedDaysOfWeek.includes(dayOfWeek)) {
    let daysToAdd = 1;
    let nextDayOfWeek = (dayOfWeek + daysToAdd) % 7;
    
    while (!this.allowedDaysOfWeek.includes(nextDayOfWeek) && daysToAdd < 7) {
      daysToAdd++;
      nextDayOfWeek = (dayOfWeek + daysToAdd) % 7;
    }
    
    nextDate.setDate(nextDate.getDate() + daysToAdd);
  }
  
  return nextDate;
};

CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.isRecurring) {
    this.nextRunDate = this.calculateNextRunDate();
  }
  
  next();
});

module.exports = mongoose.model('Campaign', CampaignSchema); 