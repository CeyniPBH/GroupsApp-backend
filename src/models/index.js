const User = require('../modules/users/user.model');
const Group = require('../modules/groups/group.model');

User.hasMany(Group, { foreignKey: 'ownerId', as: 'groups' });
Group.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

module.exports = {
    User,
    Group
};