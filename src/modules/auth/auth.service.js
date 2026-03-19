const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const e = require('express');
const { createUser, findUserByEmail } = require('./auth.model');

const registerUser = async (data) => {
    const existingUser = findUserByEmail(data.email);

    if (existingUser) {
        throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = {
        id: Date.now(),
        email: data.email,
        password: hashedPassword,
        name: data.name
    }

    return createUser(newUser)
};

const loginUser = async (email, password) => {
    const user = findUserByEmail(email);

    if (!user) {
        throw new Error('User not found');
    }

    const token = jwt.sign(
        { id: user.id, email: user.email }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' });

    return { 
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        }
    };
};

module.exports = {
    registerUser,
    loginUser
};