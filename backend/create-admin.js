const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

// Função para criar um usuário administrador
async function createAdminUser() {
  try {
    // Conectar ao MongoDB
    console.log('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Verificar se já existe um administrador
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('Administrador já existe:');
      console.log(`Nome: ${adminExists.name}`);
      console.log(`Email: ${adminExists.email}`);
      console.log(`Função: ${adminExists.role}`);
      console.log(`Status: ${adminExists.status}`);
      console.log('Use essas credenciais para fazer login no sistema.');
    } else {
      // Criar usuário administrador
      const adminUser = await User.create({
        name: 'Administrador',
        email: 'admin@promobot.com',
        password: 'admin123',
        role: 'admin',
        status: 'active',
        permissions: {
          campaigns: {
            create: true,
            read: true,
            update: true,
            delete: true
          },
          contacts: {
            create: true,
            read: true,
            update: true,
            delete: true,
            import: true
          },
          messages: {
            send: true,
            read: true
          },
          users: {
            create: true,
            read: true,
            update: true,
            delete: true
          },
          reports: {
            view: true
          },
          settings: {
            manage: true
          }
        }
      });

      console.log('Usuário administrador criado com sucesso:');
      console.log(`Nome: ${adminUser.name}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`Senha: admin123`);
      console.log('Use essas credenciais para fazer login no sistema.');
    }
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
  } finally {
    // Fechar conexão com o MongoDB
    await mongoose.disconnect();
    console.log('Conexão com MongoDB finalizada');
  }
}

// Executar a função
createAdminUser(); 