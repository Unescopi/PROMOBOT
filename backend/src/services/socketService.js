const socketIo = require('socket.io');
let io = null;

class SocketService {
  /**
   * Inicializa o serviço de Socket.IO
   * @param {Object} server - Servidor HTTP
   */
  initialize(server) {
    if (io) {
      console.warn('Socket.IO já está inicializado');
      return;
    }

    io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST']
      }
    });

    // Middleware de autenticação
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Autenticação necessária'));
      }

      // Aqui você pode adicionar a validação do token JWT
      // Por exemplo:
      // try {
      //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
      //   socket.user = decoded;
      //   next();
      // } catch (error) {
      //   next(new Error('Token inválido'));
      // }
      
      next();
    });

    // Gerenciar conexões
    io.on('connection', (socket) => {
      console.log(`Nova conexão Socket.IO: ${socket.id}`);

      // Registrar cliente para receber notificações
      socket.on('register', (data) => {
        if (data.userId) {
          socket.join(`user:${data.userId}`);
          console.log(`Usuário ${data.userId} registrado para notificações`);
        }
      });

      // Desregistrar cliente
      socket.on('unregister', (data) => {
        if (data.userId) {
          socket.leave(`user:${data.userId}`);
          console.log(`Usuário ${data.userId} desregistrado das notificações`);
        }
      });

      // Gerenciar desconexão
      socket.on('disconnect', () => {
        console.log(`Conexão Socket.IO encerrada: ${socket.id}`);
      });
    });

    console.log('Serviço Socket.IO inicializado');
  }

  /**
   * Emite um evento para todos os clientes
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  emit(event, data) {
    if (!io) {
      console.warn('Socket.IO não está inicializado');
      return;
    }

    io.emit(event, data);
  }

  /**
   * Emite um evento para um usuário específico
   * @param {string} userId - ID do usuário
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  emitToUser(userId, event, data) {
    if (!io) {
      console.warn('Socket.IO não está inicializado');
      return;
    }

    io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emite um evento para um grupo de usuários
   * @param {string[]} userIds - Lista de IDs de usuários
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  emitToUsers(userIds, event, data) {
    if (!io) {
      console.warn('Socket.IO não está inicializado');
      return;
    }

    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }

  /**
   * Emite um evento para uma sala específica
   * @param {string} room - Nome da sala
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  emitToRoom(room, event, data) {
    if (!io) {
      console.warn('Socket.IO não está inicializado');
      return;
    }

    io.to(room).emit(event, data);
  }

  /**
   * Obtém a instância do Socket.IO
   * @returns {Object|null} Instância do Socket.IO
   */
  getInstance() {
    return io;
  }
}

module.exports = new SocketService(); 