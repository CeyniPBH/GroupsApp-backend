const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMember = sequelize.define('ChatMember', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    chatId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member'
    }
}, {
    timestamps: true,
    tableName: 'chat_members',
    indexes: [
        { unique: true, fields: ['userId', 'chatId'] }
    ]
});

module.exports = ChatMember;