const db = require("../config/db");

// Get all official stores
const Store = require("../models/storeModel");
const FilterCategory = require("../models/filterCategoryModel");

// GET all stores
const getAllStores = async (req, res) => {
  try {
    const stores = await Store.findAll();
    res.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ error: "Server error" });
  }
};;


// Get all filter categories
const getAllFilterCategories = async (req, res) => {
  try {
    const filters = await FilterCategory.findAll();
    res.json(filters);
  } catch (error) {
    console.error("❌ Error fetching filter categories:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// Export all functions at the end
module.exports = {
  getAllStores,
  getAllFilterCategories
};