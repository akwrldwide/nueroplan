const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, profileController.createProfile);
router.get('/', authMiddleware, profileController.getProfile);
router.put('/', authMiddleware, profileController.updateProfile);
router.put('/settings', authMiddleware, profileController.updateUserSettings);

module.exports = router;
