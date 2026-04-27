require('dotenv').config();
const sequelize = require('../config/database');
require('../modules/users/user.model');
const { startGrpcServer } = require('./server');

// Conectar a la base de datos y levantar solo el servidor gRPC
sequelize.sync()
  .then(() => {
      console.log('Database connected for gRPC Users Service');
      startGrpcServer();
  })
  .catch(err => {
      console.error('Error connecting to the database:', err);
      process.exit(1);
  });