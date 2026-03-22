const express = require('express');
const router = express.Router();
const { joinGroup, addMember, leaveGroup, removeMember } = require('./membership.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.post('/join', verifyToken, joinGroup);
router.post('/add-member', verifyToken, addMember);
router.delete('/leave', verifyToken, leaveGroup);
router.delete('/remove-member', verifyToken, removeMember);

module.exports = router;