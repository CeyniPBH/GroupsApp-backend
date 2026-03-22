const { Group, User, Membership } = require('../../models');

const createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;

        const newGroup = await Group.create({ name, description, ownerId: req.user.id });

        await Membership.create({
            userId: req.user.id,
            groupId: newGroup.id,
            role: 'admin'
        })

        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });

    }
};

const getGroups = async (req, res) => {
    try {
        const groups = await Group.findAll({ 
        include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }] });
        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGroupsMembership = async (req, res) => {
    try {
        const { groupId } = req.params;

        const groups = await Group.findByPk(groupId, {
            include: [{ model: User, as: 'members', attributes: ['id', 'name', 'email'], through: { attributes: ['role'] } }]
        });
        if (!groups) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.json(groups);
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        await group.destroy();
        res.status(200).json({ message: 'Group deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupsMembership,
    deleteGroup
};