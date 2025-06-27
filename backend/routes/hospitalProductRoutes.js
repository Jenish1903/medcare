const express = require("express");
const router = express.Router();
const controller = require("../controllers/hospitalProductController");

// Public routes
router.get("/products", controller.getHospitalProducts);

module.exports = router;
