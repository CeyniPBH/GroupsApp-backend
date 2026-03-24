const User = require('../modules/users/user.model');
const Group = require('../modules/groups/group.model');
const Membership = require('../modules/membership/membership.model')
const Message = require('../modules/messages/message.model');
const Chat = require('./chat.model');
const Contact = require('./contact.model');
const ChatMember = require('./chat_member.model');

User.hasMany(Group, { foreignKey: 'ownerId', as: 'groups' });
Group.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.belongsToMany(Group, { through: Membership, foreignKey: 'userId', as: 'joinedGroups' });
Group.belongsToMany(User, { through: Membership, foreignKey: 'groupId', as: 'members' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

User.belongsToMany(User, { through: Contact, foreignKey: 'userId', as: 'contacts', otherKey: 'contactId' });
User.belongsToMany(User, { through: Contact, foreignKey: 'contactId', as: 'contactedBy', otherKey: 'userId' });

Contact.belongsTo(User, { foreignKey: 'userId', as: 'requester' });
Contact.belongsTo(User, { foreignKey: 'contactId', as: 'receiver' });

// ChatMembers
User.belongsToMany(Chat, { through: ChatMember, foreignKey: 'userId', as: 'chats' });
Chat.belongsToMany(User, { through: ChatMember, foreignKey: 'chatId', as: 'participants' });

Chat.hasMany(ChatMember, { foreignKey: 'chatId', as: 'chatMembers' });
ChatMember.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });
ChatMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
    User,
    Group,
    Membership,
    Message,
    Chat,
    Contact,
    ChatMember
};