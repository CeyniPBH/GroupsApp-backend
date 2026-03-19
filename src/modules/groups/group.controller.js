const Group = require('./group.model');

const createGroup = async (req, res) => {
    try {
        const { name, description, ownerId } = req.body;
        const newGroup = await Group.create({ name, description, ownerId: req.user.id });
        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });

    }
};

module.exports = {
    createGroup
};