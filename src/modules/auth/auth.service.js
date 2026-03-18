const e = require('express');
const { createUser, findUserByEmail } = require('./auth.model');

const registerUser = (data) => {
    const existingUser = findUserByEmail(data.email);

    if (existingUser) {
        throw new Error('User already exists');
    }

    const newUser = {
        id: Date.now(),
        email: data.email,
        password: data.password
    }

    return createUser(newUser)
};

const loginUser = (email, password) => {
    const user = findUserByEmail(email);

    if (!user || user.password !== password) {
        throw new Error('User not found or invalid password');
    }

    return user;
};

module.exports = {
    registerUser,
    loginUser
};