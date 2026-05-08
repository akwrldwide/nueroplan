const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const authMiddleware = require('../middleware/auth');

router.get('/status', authMiddleware, academicController.getAcademicStatus);
router.post('/progress', authMiddleware, academicController.progressSemester);

module.exports = router;
