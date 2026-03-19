const express = require('express');
const router = express.Router();
const { createUser } = require('./user.controller');
const verifyToken = require('../auth/auth.middleware');

router.get('/', (req, res) => {
    res.json({
        message: 'User route is working',
        user: req.user
    });
});

module.exports = router;