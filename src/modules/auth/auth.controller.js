const { Modality } = require('firebase/ai');
const { registerUser, loginUser } = require('./auth.service');

const register = (req, res) => {
    try {
        const user = registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const login = (req, res) => {
    try {
        const { email, password } = req.body;
        const user = loginUser(email, password);
        res.json(user);
    }   catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    register,
    login
};