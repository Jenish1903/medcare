const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const Product = require("./productModel");

const ProductReview = sequelize.define("ProductReview", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: "id",
    },
    onDelete: "CASCADE",
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: "tbl_product_review",
  timestamps: false
});

// Associations
Product.hasMany(ProductReview, { foreignKey: "product_id", as: "reviews" });
ProductReview.belongsTo(Product, { foreignKey: "product_id", as: "product" });

module.exports = ProductReview;
