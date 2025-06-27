const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authenticate = require('../middleware/authMiddleware');
const authocrizeRoles = require('../middleware/roleMiddleware');

// Routes
router.post('/create', authenticate, authocrizeRoles(['admin'],['doctor']), serviceController.createService);
router.get('/allservice',authenticate, serviceController.getAllServices);
router.put('/:id', authenticate, authocrizeRoles(['admin'],['doctor']), serviceController.updateService);
router.delete('/:id', authenticate, authocrizeRoles(['admin'],['doctor']), serviceController.deleteService);

module.exports = router;