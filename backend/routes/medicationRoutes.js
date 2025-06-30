// const express = require("express");
// const router = express.Router();
// const controller = require("../controllers/medicationController");
// const { authenticate, authorizeRoles } = require("../middleware/roleMiddleware");

// router.post(
//   "/",
//   authenticate,
//   authorizeRoles(["doctor", "patient"]),
//   controller.createMedication
// );

// router.get(
//   "/my",
//   authenticate,
//   authorizeRoles(["doctor", "patient", "admin"]),
//   controller.getMyMedications
// );

// router.delete(
//   "/:id",
//   authenticate,
//   authorizeRoles(["doctor", "patient"]),
//   controller.deleteMedication
// );

// module.exports = router;
