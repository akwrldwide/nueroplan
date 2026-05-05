const express = require('express');
const router = express.Router();
const mistakeController = require('../controllers/mistakeController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, mistakeController.createMistake);
router.get('/', authMiddleware, mistakeController.getMistakes);

module.exports = router;
