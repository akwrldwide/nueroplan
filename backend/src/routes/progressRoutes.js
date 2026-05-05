const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middleware/auth');
const onboardingGuard = require('../middleware/onboardingGuard');

router.get('/dashboard', authMiddleware, onboardingGuard, progressController.getDashboardStats);
router.get('/history/global', authMiddleware, progressController.getGlobalHistory);
router.post('/session/complete', authMiddleware, progressController.markSessionComplete);

module.exports = router;
