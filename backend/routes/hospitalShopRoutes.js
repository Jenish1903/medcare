const express = require("express");
const router = express.Router();
const controller = require("../controllers/hospitalShopController");

router.get("/stores", controller.getAllStores);
router.get("/filters", controller.getAllFilterCategories);

module.exports = router;
