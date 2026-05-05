const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, topicController.getUserTopics);
router.post('/save', authMiddleware, topicController.saveUserTopics);
router.post('/', authMiddleware, topicController.createTopic);
router.put('/:id', authMiddleware, topicController.updateTopic);
router.delete('/:id', authMiddleware, topicController.deleteTopic);

module.exports = router;
