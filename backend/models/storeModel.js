const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Store = sequelize.define("Store", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  logo: {
    type: DataTypes.STRING(255),
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
  tableName: "tbl_store",
  timestamps: false   
});

module.exports = Store;
