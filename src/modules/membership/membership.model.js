const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Membership = sequelize.define('Membership', {
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member'
    }
}, {
    timestamps: true,
    tableName: 'memberships'
});

module.exports = Membership;