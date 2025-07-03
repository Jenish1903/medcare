const express = require('express');
const router = express.Router();
const controller = require('../controllers/healthHistoryController');
const authenticate = require('../middleware/authMiddleware');

// POST: Add health history entry
router.post('/create', authenticate, controller.addHealthHistory);

// GET: All entries
router.get('/', authenticate, controller.getAllHealthHistory);

// GET: By type (disease, allergy, etc.)
router.get('/:type', authenticate, controller.getHealthHistoryByType);

// GET: Specific detail by ID and type
router.get('/:type/:id', authenticate, controller.getHealthHistoryDetail);

module.exports = router;
