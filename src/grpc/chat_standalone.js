require('dotenv').config();
const sequelize = require('../config/database');
require('../models'); // Importar los modelos para sus asociaciones
const { startChatGrpcServer } = require('./chat_server');

sequelize.sync()
  .then(() => {
      console.log('Database connected for gRPC Chat Service');
      startChatGrpcServer();
  })
  .catch(err => {
      console.error('Error connecting to the database for Chat service:', err);
      process.exit(1);
  });