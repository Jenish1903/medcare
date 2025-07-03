const HealthHistory = require('../models/healthHistoryModel');

exports.addHealthHistory = async (req, res) => {
  const user_id = req.user.id;
  const { type, title, description, severity, diagnosis_date } = req.body;

  try {
    const record = await HealthHistory.create({
      user_id,
      type,
      title,
      description,
      severity,
      diagnosis_date
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllHealthHistory = async (req, res) => {
  const user_id = req.user.id;

  try {
    const records = await HealthHistory.findAll({ where: { user_id } });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHealthHistoryByType = async (req, res) => {
  const user_id = req.user.id;
  const { type } = req.params;

  try {
    const records = await HealthHistory.findAll({
      where: { user_id, type }
    });

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHealthHistoryDetail = async (req, res) => {
  const user_id = req.user.id;
  const { type, id } = req.params;

  try {
    const record = await HealthHistory.findOne({
      where: { user_id, type, id }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
