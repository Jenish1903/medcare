const sequelize = require('../config/sequelize');
const Product = require('./productModel');
const Store = require('./storeModel');

// Associations
Product.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
Store.hasMany(Product, { foreignKey: 'store_id', as: 'products' });

module.exports = {
  sequelize,
  Product,
  Store,
};
