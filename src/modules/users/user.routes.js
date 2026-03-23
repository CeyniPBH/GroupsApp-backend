const express = require('express');
const router = express.Router();
const { createUser, getMyGroups, findByHandle, searchByName } = require('./user.controller');
const { verifyToken } = require('../auth/auth.middleware');


router.post('/search', verifyToken, findByHandle);
router.get('/search/name', verifyToken, searchByName);
router.get('/my-groups', verifyToken, getMyGroups);


module.exports = router;