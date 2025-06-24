const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust the path if needed

const user = sequelize.define('tbl_user', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(15),
    unique: true,
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  status_flag: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
  },
  isNotify: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
  },
  otp: {
    type: DataTypes.STRING(6),
    allowNull: true,
  },
  otp_expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isVerify: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
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
  },
}, {
  timestamps: false, // Since you manually manage timestamps
  tableName: 'tbl_user',
});

module.exports = user;
