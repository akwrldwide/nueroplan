const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// All routes here require being authenticated AND being an Admin
router.use(authMiddleware);
router.use(adminMiddleware);

// 1. Dashboard
router.get('/stats', adminController.getDashboardStats);

// 2. Academic Structure
router.get('/structure', adminController.getAcademicStructure);

// Sessions
router.post('/sessions', adminController.createSession);
router.put('/sessions/:id', adminController.updateSession);
router.delete('/sessions/:id', adminController.deleteSession);
router.post('/sessions/:id/notify', adminController.notifyStudentsOfSession);

// Semester Windows
router.post('/windows', adminController.createWindow);
router.put('/windows/:id', adminController.updateWindow);
router.delete('/windows/:id', adminController.deleteWindow);

// Programmes
router.post('/programmes', adminController.createProgramme);
router.put('/programmes/:id', adminController.updateProgramme);
router.delete('/programmes/:id', adminController.deleteProgramme);

// Courses
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// Topics
router.post('/topics', adminController.createTopic);
router.put('/topics/:id', adminController.updateTopic);
router.delete('/topics/:id', adminController.deleteTopic);

// 3. Students
router.get('/students', adminController.getStudents);
router.get('/students/:id', adminController.getStudentProfile);
router.put('/students/:id/active', adminController.toggleStudentActive);
router.post('/students/:id/regenerate-plan', adminController.regenerateStudentPlan);
router.post('/students/:id/reset-password', adminController.resetStudentPassword);

// 4. Analytics
router.get('/analytics', adminController.getCoreAnalytics);

// 5. Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// 6. Admin Users
router.get('/admins', adminController.getAdmins);
router.post('/admins', adminController.addAdmin);
router.delete('/admins/:id', adminController.removeAdmin);
router.put('/admins/:id/password', adminController.changeAdminPassword);

module.exports = router;
