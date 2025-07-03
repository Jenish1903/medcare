// models/PrescriptionModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Prescription = sequelize.define('Prescription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  doctor_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  medicine_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dosage_instruction: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  prescription_start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  prescription_end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'past'),
    defaultValue: 'past'
  }
}, {
  tableName: 'tbl_prescriptions',
  timestamps: true
});

module.exports = Prescription; // ✅ Correct export
