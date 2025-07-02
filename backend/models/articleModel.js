// models/articleModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize"); // ✅ Import your Sequelize instance here

const Article = sequelize.define("Article", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  article_description: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  create_user: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  update_user: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  create_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  update_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  status_flag: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
});

module.exports = Article;
