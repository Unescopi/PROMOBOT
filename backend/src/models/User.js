const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'O nome é obrigatório'],
    trim: true,
    maxlength: [50, 'O nome não pode ter mais de 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'O e-mail é obrigatório'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor, forneça um e-mail válido'
    ]
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'A senha é obrigatória'],
    minlength: 6,
    select: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  permissions: {
    campaigns: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    contacts: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: true }
    },
    messages: {
      send: { type: Boolean, default: true },
      read: { type: Boolean, default: true }
    },
    users: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      view: { type: Boolean, default: true }
    },
    settings: {
      manage: { type: Boolean, default: false }
    }
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Atualizar o campo updatedAt a cada modificação
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Criptografar senha usando bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Assinar token JWT
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Verificar se a senha informada corresponde à senha armazenada
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Verificar se o usuário tem uma permissão específica
UserSchema.methods.hasPermission = function(area, action) {
  // Admins sempre têm todas as permissões
  if (this.role === 'admin') return true;
  
  // Verifica permissão específica
  return this.permissions && 
         this.permissions[area] && 
         this.permissions[area][action] === true;
};

module.exports = mongoose.model('User', UserSchema); 