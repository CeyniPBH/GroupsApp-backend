const { Membership } = require('../../models');

const isAdmin = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        
        const membership = await Membership.findOne({ 
            where: { 
                userId: req.user.id, 
                groupId } 
            });
        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { isAdmin };