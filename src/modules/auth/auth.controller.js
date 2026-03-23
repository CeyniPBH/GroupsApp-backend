const User = require('../users/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el nuevo usuario
        const tag = await generateUniqueTag(name);
        const newUser = await User.create({
            name,
            tag,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                handle: `${newUser.name}#${newUser.tag}`,
                email: newUser.email,
                tag: newUser.tag
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user', details: error.message });
    }
};

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

        await user.update({ status: 'active' });

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, tag: user.tag },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                tag: user.tag,
                handle: `${user.name}#${user.tag}`,
                email: user.email,
                status: user.status
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'Error logging in', details: error.message });
    }
};

const generateUniqueTag = async (name) => {
    const MAX_ATTEMPTS = 20;
    for (let i= 0; i < MAX_ATTEMPTS; i++) {
        const tag = String(Math.floor(1000 + Math.random() * 9000)); // Genera un número aleatorio de 4 dígitos
        const exists = await User.findOne({ where: { name, tag } });
        if (!exists) {
            return tag;
        }
    }
    throw new Error('Unable to generate unique tag after multiple attempts');
};

module.exports = {
    register,
    login,
    generateUniqueTag
};