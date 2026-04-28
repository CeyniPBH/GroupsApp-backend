const express = require('express');
const router = express.Router();
const { getMyGroups, findByHandle, searchByName, getProfile, updateAvatar, updateName } = require('./user.controller');
const { verifyToken } = require('../auth/auth.middleware');
const { uploadToS3 } = require('../../config/s3');

router.get('/profile', verifyToken, getProfile);
router.get('/search', verifyToken, searchByName);
router.post('/search', verifyToken, findByHandle);
router.get('/search/name', verifyToken, searchByName);
router.get('/my-groups', verifyToken, getMyGroups);
router.put('/me/avatar', verifyToken, uploadToS3.single('avatar'), updateAvatar);
router.put('/me/name', verifyToken, updateName);

module.exports = router;