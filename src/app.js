const express = require('express');
const cors = require('cors');
// const morgan = require('morgan');
require('dotenv').config();
const authRoutes = require('./modules/auth/auth.routes');

const app = express();

// Middleware
app.use(cors());
app.use(authRoutes);
// app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
