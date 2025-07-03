const Prescription = require('../models/PrescriptionModel');

// Add prescription
const addPrescription = async (req, res) => {
  const { doctor_name, medicine_name, dosage_instruction, prescription_start_date, prescription_end_date } = req.body;
  const user_id = req.user.id;

  try {
    const createdAt = new Date();
    const startDate = new Date(prescription_start_date);
    const endDate = new Date(prescription_end_date);
    const status = createdAt >= startDate && createdAt <= endDate ? 'active' : 'past';

    const newPrescription = await Prescription.create({
      user_id,
      doctor_name,
      medicine_name,
      dosage_instruction,
      prescription_start_date: startDate,
      prescription_end_date: endDate,
      status
    });

    res.status(201).json({ success: true, data: newPrescription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// All
const getAllPrescriptions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const prescriptions = await Prescription.findAll({
      where: { user_id },
      order: [['prescription_start_date', 'DESC']]
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Active
const getActivePrescriptions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const prescriptions = await Prescription.findAll({
      where: { user_id, status: 'active' },
      order: [['prescription_start_date', 'DESC']]
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Past
const getPastPrescriptions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const prescriptions = await Prescription.findAll({
      where: { user_id, status: 'past' },
      order: [['prescription_start_date', 'DESC']]
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Recent (default)
const getRecentPrescriptions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const prescriptions = await Prescription.findAll({
      where: { user_id },
      order: [['prescription_start_date', 'DESC']]
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Oldest
const getOldestPrescriptions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const prescriptions = await Prescription.findAll({
      where: { user_id },
      order: [['prescription_start_date', 'ASC']]
    });
    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addPrescription,
  getAllPrescriptions,
  getActivePrescriptions,
  getPastPrescriptions,
  getRecentPrescriptions,
  getOldestPrescriptions
};
