const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupsMembership, deleteGroup } = require('./group.controller');
const { verifyToken } = require('../auth/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');


router.post('/', verifyToken, createGroup);
router.get('/', verifyToken, getGroups);
router.get('/:groupId/membership', verifyToken, getGroupsMembership);
router.delete('/:groupId', verifyToken, isAdmin, deleteGroup);

module.exports = router;