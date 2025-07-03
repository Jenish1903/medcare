// routes/prescriptionRoutes.js
const express = require('express');
const router = express.Router();
const {
  addPrescription,
  getAllPrescriptions,
  getActivePrescriptions,
  getPastPrescriptions,
  getRecentPrescriptions,
  getOldestPrescriptions
} = require('../controllers/prescriptionController');
const authenticate = require('../middleware/authMiddleware');

// POST - Add new prescription
router.post('/create', authenticate, addPrescription);

// GET - Different filters
router.get('/', authenticate, getAllPrescriptions);
router.get('/active', authenticate, getActivePrescriptions);
router.get('/past', authenticate, getPastPrescriptions);
router.get('/recent', authenticate, getRecentPrescriptions);
router.get('/oldest', authenticate, getOldestPrescriptions);

module.exports = router;
