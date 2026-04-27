require('dotenv').config();
const sequelize = require('../config/database');
require('../modules/users/user.model');
const { startAuthGrpcServer } = require('./auth_server');

sequelize.sync()
  .then(() => {
      console.log('Database connected for gRPC Auth Service');
      startAuthGrpcServer();
  })
  .catch(err => {
      console.error('Error connecting to the database for Auth service:', err);
      process.exit(1);
  });