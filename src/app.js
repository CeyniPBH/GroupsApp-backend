const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./modules/auth/auth.routes');
const sequelize = require('./config/database');
require('./modules/users/user.model'); // Import models to initialize them
const userRoutes = require('./modules/users/user.routes');
const groupRoutes = require('./modules/groups/group.routes');
require('./models'); // Import models to set up associations


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/groups", groupRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// Test DB connection
sequelize.sync()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Error connecting to the database:', err));

// Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});