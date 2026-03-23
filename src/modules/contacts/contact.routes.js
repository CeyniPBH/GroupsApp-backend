const express = require('express');
const router = express.Router();
const { addContact, getContacts, acceptContact, blockContact } = require('./contact.controller');
const { verifyToken } = require('../auth/auth.middleware');

router.post('/', verifyToken, addContact);
router.get('/', verifyToken, getContacts);
router.put('/:id/accept', verifyToken, acceptContact);
router.put('/:id/block', verifyToken, blockContact);

module.exports = router;