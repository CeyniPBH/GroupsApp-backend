const Membership = require('./membership.model');

const joinGroup = async (req, res) => {
    try {
        const { groupId } = req.body;

        const existingMembership = await Membership.findOrCreate ({ where: { userId: req.user.id, groupId } });
        if (existingMembership) {
            return res.status(400).json({ message: 'User is already a member of this group' });
        }

        const membership = await Membership.create({
            userId: req.user.id,
            groupId
        });
        res.status(201).json(membership);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;

        const existingMembership = await Membership.findOrCreate ({ where: { userId, groupId } });
        if (existingMembership) {
            return res.status(400).json({ message: 'User is already a member of this group' });
        }

        const membership = await Membership.create({
            userId,
            groupId,
            role: 'member'
        });
        res.status(201).json(membership);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.body;

        const deleted = await Membership.destroy({ where: { userId: req.user.id, groupId } });
        if (!deleted) {
            return res.status(400).json({ message: 'User is not a member of this group' });
        }

        res.json({ message: 'Left group successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;

        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Admins cannot remove themselves' });
        }

        const deleted = await Membership.destroy({ where: { userId, groupId } });
        if (!deleted) {
            return res.status(400).json({ message: 'User is not a member of this group' });
        }

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { joinGroup, addMember, leaveGroup, removeMember };