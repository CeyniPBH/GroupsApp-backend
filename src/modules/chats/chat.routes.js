const express = require('express');
const router = express.Router();
const { createChat, getChats } = require('./chat.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.post('/', verifyToken, createChat);
router.get('/', verifyToken, getChats);

module.exports = router;