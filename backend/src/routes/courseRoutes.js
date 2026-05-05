const express = require('express');
const router = express.Router();
const { getCurriculum, saveUserCourses, getUserCourses, updateUserCourse, bulkUpdateUserCourses, markExamCompleted, addCustomUserCourse, editUserCourse, deleteUserCourse } = require('../controllers/courseController');
const authMiddleware = require('../middleware/auth');

router.get('/curriculum', authMiddleware, getCurriculum);
router.get('/', authMiddleware, getUserCourses);
router.post('/', authMiddleware, saveUserCourses);
router.post('/bulk-update', authMiddleware, bulkUpdateUserCourses);
router.put('/:id', authMiddleware, updateUserCourse);
router.post('/:id/mark-completed', authMiddleware, markExamCompleted);

router.post('/custom', authMiddleware, addCustomUserCourse);
router.put('/custom/:id', authMiddleware, editUserCourse);
router.delete('/user-course/:id', authMiddleware, deleteUserCourse);

module.exports = router;
