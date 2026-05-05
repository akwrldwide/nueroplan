const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

router.get('/motivation', authMiddleware, aiController.getMotivation);

module.exports = router;
