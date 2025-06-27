const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING
  },
  status_flag: {
    type: DataTypes.TINYINT,
    defaultValue: 1
  },
  create_user: {
    type: DataTypes.INTEGER
  },
  update_user: {
    type: DataTypes.INTEGER
  },
  create_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  update_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'tbl_services',
  timestamps: false
});

module.exports = Service;
