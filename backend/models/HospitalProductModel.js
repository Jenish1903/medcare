const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize'); // adjust path as needed

const HospitalProduct = sequelize.define('HospitalProduct', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status_flag: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
  },
  create_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  update_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  create_user: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  update_user: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'tbl_hospital_products',
  timestamps: false, // We'll manage dates manually
});

module.exports = HospitalProduct;
