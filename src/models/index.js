const User = require('../modules/users/user.model');
const Group = require('../modules/groups/group.model');
const Membership = require('../modules/membership/membership.model')

User.hasMany(Group, { foreignKey: 'ownerId', as: 'groups' });
Group.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.belongsToMany(Group, { through: Membership, foreignKey: 'userId', as: 'joinedGroups' });
Group.belongsToMany(User, { through: Membership, foreignKey: 'groupId', as: 'members' });

module.exports = {
    User,
    Group,
    Membership
};