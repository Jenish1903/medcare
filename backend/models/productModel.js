const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  benefits: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  how_to_use: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  warnings: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  storage: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  manufacturer: {
    type: DataTypes.STRING(255),
    allowNull: true,
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
  tableName: "tbl_product",
  timestamps: false
});

module.exports = Product;
