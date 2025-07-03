const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const HealthHistory = sequelize.define('HealthHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('disease', 'allergy', 'surgery', 'drug'),
    allowNull: false
  },
  title: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  severity: { type: DataTypes.STRING },
  diagnosis_date: { type: DataTypes.DATE }
}, {
  tableName: 'tbl_health_history',
  timestamps: true
});

module.exports = HealthHistory;
