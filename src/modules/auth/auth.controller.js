const { Modality } = require('firebase/ai');
const User = require('../users/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        const token = jwt.sign(
        { id: user.id, email: user.email }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' });
        res.json({ token });

        res.json({ message: 'Login successful', token });
    }   catch (error) {
        res.status(400).json({ error: 'Error logging in', details: error.message });
    }
};

module.exports = {
    login
};