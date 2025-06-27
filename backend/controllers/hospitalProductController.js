const HospitalProduct = require('../models/HospitalProductModel');

// Get all active products
const getHospitalProducts = async (req, res) => {
  try {
    const products = await HospitalProduct.findAll({ where: { status_flag: 1 } });
    res.json({ success: true, data: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getHospitalProducts,
};