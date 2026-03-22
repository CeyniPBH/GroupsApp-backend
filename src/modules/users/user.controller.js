const { User, Group, Membership } = require('../../models');
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

const getMyGroups = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: {
                model: Group,
                as: 'joinedGroups',
                attributes: ['id', 'name', 'description'],
                through: { attributes: ['role'] }
            }
        });
        res.json(user.joinedGroups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createUser,
    getMyGroups
};