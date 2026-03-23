const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, uploadFile, markChatAsRead } = require('./message.controller');
const { verifyToken } = require('../auth/auth.middleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/', verifyToken, sendMessage);
router.get('/:chatId', verifyToken, getMessages);
router.put('/:chatId/read', verifyToken, markChatAsRead);
router.post('/upload', verifyToken, upload.single('file'), uploadFile);

module.exports = router;