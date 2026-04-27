const User = require('../users/user.model');
const { registerViaGrpc, loginViaGrpc } = require('../../grpc/client');
const grpc = require('@grpc/grpc-js');

const register = async (req, res) => {
    try {
        const { name: rawName, username, email, password } = req.body;
        const name = rawName || username;
        const response = await registerViaGrpc(name, email, password);
        res.status(201).json({ message: 'User registered successfully', user: response });
    } catch (error) {
        if (error.code === grpc.status.ALREADY_EXISTS) {
            return res.status(400).json({ error: error.details });
        }
        res.status(500).json({ error: 'Error registering user', details: error.details || error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const response = await loginViaGrpc(email, password);
        res.json({ message: 'Login successful', ...response });
    } catch (error) {
        if (error.code === grpc.status.NOT_FOUND || error.code === grpc.status.UNAUTHENTICATED) {
            return res.status(400).json({ error: error.details });
        }
        res.status(500).json({ error: 'Error logging in', details: error.details || error.message });
    }
};

module.exports = {
    register,
    login
};