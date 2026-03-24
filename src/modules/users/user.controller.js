const { User, Group, Membership } = require('../../models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

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

const findByHandle = async (req, res) => {
    try {
        const { handle } = req.body;

        if (!handle || !handle.includes('#')) {
            return res.status(400).json({ error: 'Invalid handle format. Expected format: name#tag' });
        }

        const [name, tag] = handle.split('#');

        const user = await User.findOne({ 
            where: { name, tag }, 
            attributes: ['id', 'name', 'tag'] 
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.id == req.user.id) {
            return res.status(400).json({ error: 'You cannot search for yourself' });
        }

        res.json({
            id: user.id,
            name: user.name,
            tag: user.tag,
            handle: `${user.name}#${user.tag}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const searchByName = async (req, res) => {
    const { q } = req.query;

    try {
        const users = await User.findAll({
            where: {
                name: { [Op.like]: `%${q.trim()}%` },
                id: { [Op.ne]: req.user.id }
            },
            attributes: ['id', 'name', 'tag'],
            limit: 10
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const avatarUrl = `/uploads/${req.file.filename}`;
        await User.update({ avatar: avatarUrl }, { where: { id: req.user.id } });
        res.json({ avatar: avatarUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateName = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        await User.update({ name: name.trim() }, { where: { id: req.user.id } });
        res.json({ name: name.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createUser,
    getMyGroups,
    findByHandle,
    searchByName,
    updateAvatar,
    updateName
};