const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define('tbl_user', {
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
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    unique: true,
    validate: {
      is: /^[0-9]{10,15}$/, // basic validation for digits
    },
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
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
  role: {
    type: DataTypes.ENUM('admin', 'doctor', 'patient'),
    defaultValue: 'patient',
    allowNull: false,
  },
  status_flag: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '1 = active, 0 = inactive',
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
    comment: '0 = not verified, 1 = verified',
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
  tableName: 'tbl_user',
  timestamps: false, // you're manually handling created/updated dates
  underscored: true, // optional: uses snake_case for fields in the DB
});

module.exports = User;
