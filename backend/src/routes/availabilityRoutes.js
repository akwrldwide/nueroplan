const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, availabilityController.getAvailability);
router.post('/', authMiddleware, availabilityController.saveAvailability);

module.exports = router;
