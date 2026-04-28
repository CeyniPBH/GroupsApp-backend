require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

const authRoutes = require('./modules/auth/auth.routes');
const sequelize = require('./config/database');
require('./modules/users/user.model'); // Import models to initialize them
const userRoutes = require('./modules/users/user.routes');
const groupRoutes = require('./modules/groups/group.routes');
require('./models'); // Import models to set up associations
const membershipRoutes = require('./modules/membership/membership.routes');
const messageRoutes = require('./modules/messages/message.routes');
const contactRoutes = require('./modules/contacts/contact.routes');
const chatRoutes = require('./modules/chats/chat.routes');
const { startGrpcServer } = require('./grpc/server');
const { startAuthGrpcServer } = require('./grpc/auth_server');
const { startChatGrpcServer } = require('./grpc/chat_server');

const app = express();
const server = http.createServer(app);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const io = socketIo(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ["GET", "POST"]
    }
});

// Configurar clientes Redis (uno para publicar y otro para suscribirse)
const pubClient = createClient({ 
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` 
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis Adapter conectado a Socket.IO exitosamente');
}).catch(err => {
    console.error('Error conectando Redis a Socket.IO:', err);
    process.exit(1); // Falla intencionalmente en caso de error para que Docker/AWS reinicie el contenedor
});

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/groups", groupRoutes);
app.use("/memberships", membershipRoutes);
app.use("/messages", messageRoutes);
app.use("/contacts", contactRoutes);
app.use("/chats", chatRoutes);

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
    });

    socket.on('sendMessage', async (data) => {
        // Aquí puedes emitir el mensaje a la sala
        io.to(data.chatId).emit('newMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Routes
app.get('/', (req, res) => {
    res.status(200).send('Welcome to the API');
});

// Health check endpoint para Kubernetes (Liveness/Readiness Probes)
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ status: 'UP', database: 'connected' });
    } catch (error) {
        console.error('Healthcheck failed:', error);
        res.status(500).json({ status: 'DOWN', database: 'disconnected' });
    }
});

// Test DB connection
const dbConnect = process.env.NODE_ENV === 'development' ? sequelize.sync() : sequelize.authenticate();

dbConnect
  .then(() => {
      console.log('Database connected');
      if (process.env.RUN_INTERNAL_GRPC !== 'false') {
          startGrpcServer(); // Iniciar servidor gRPC de Usuarios
          startAuthGrpcServer(); // Iniciar servidor gRPC de Auth
          startChatGrpcServer(); // Iniciar servidor gRPC de Chats
      }
  })
  .catch(err => {
      console.error('Error connecting to the database:', err);
      process.exit(1); // Falla intencionalmente para que Docker reinicie el contenedor
  });

// Port
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// Manejo de señales de apagado para Kubernetes (Graceful Shutdown)
const gracefulShutdown = () => {
    console.log('Señal de apagado recibida (SIGTERM/SIGINT). Preparando cierre seguro...');
    server.close(async () => {
        console.log('Se dejaron de aceptar nuevas peticiones HTTP.');
        try {
            // Cerrar conexiones persistentes
            await sequelize.close();
            await pubClient.quit();
            await subClient.quit();
            console.log('Conexiones a BD y Redis cerradas exitosamente. Saliendo...');
            process.exit(0);
        } catch (error) {
            console.error('Error al cerrar conexiones durante el apagado:', error);
            process.exit(1);
        }
    });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);