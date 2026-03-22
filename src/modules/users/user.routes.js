const express = require('express');
const router = express.Router();
const { createUser, getMyGroups } = require('./user.controller');
const { verifyToken } = require('../auth/auth.middleware');


router.post('/', createUser);
router.get('/me/groups', verifyToken, getMyGroups);


module.exports = router;