const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
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

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
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
  res.send('Welcome to the API');
});

// Test DB connection
sequelize.sync({ force: false })
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Error connecting to the database:', err));

// Port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});