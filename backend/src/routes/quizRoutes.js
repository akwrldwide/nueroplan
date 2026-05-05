const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const authMiddleware = require('../middleware/auth');

router.post('/generate', authMiddleware, quizController.generateQuiz);
router.post('/ai-result', authMiddleware, quizController.saveAIQuizResult);
router.get('/results', authMiddleware, quizController.getQuizResults);
router.get('/insights', authMiddleware, quizController.getQuizTrackerInsights);
router.get('/:course_id', authMiddleware, quizController.getQuizQuestions);
router.post('/:course_id', authMiddleware, quizController.submitQuiz);

module.exports = router;
