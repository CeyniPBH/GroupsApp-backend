const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chat = sequelize.define('Chat', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('direct', 'group'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true // Solo para grupos
    },
    lastMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    lastMessageTime: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'chats'
});

module.exports = Chat;