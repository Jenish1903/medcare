const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Cart = sequelize.define("Cart", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
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
  tableName: "tbl_cart_items",
  timestamps: false,
});

module.exports = Cart;
