const User = require('./user.model');
const bcrypt = require('bcrypt');

const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ name, email, password: hashedPassword });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error',
        error: 'Error creating user',
        details: error.message
    });
    }
};

module.exports = {
    createUser
};