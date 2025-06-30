// const { Medication } = require("../models/medicationModel");
// const{ user } = require("../models/userModel");

// exports.createMedication = async (req, res) => {
//   const { role, id: creatorId } = req.user;
//   const {
//     patient_id, medicine_name, strength, dosage, period,
//     times_per_day, time_slots, food_instruction,
//     start_date, duration, notes
//   } = req.body;

//   try {
//     if (role === "doctor" && !patient_id)
//       return res.status(400).json({ message: "Patient ID required" });

//     const medication = await Medication.create({
//       doctor_id: role === "doctor" ? creatorId : null,
//       patient_id: role === "patient" ? creatorId : patient_id,
//       medicine_name, strength, dosage, period,
//       times_per_day, time_slots, food_instruction,
//       start_date, duration, notes
//     });

//     res.status(201).json({ message: "Medication added", medication });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.getMyMedications = async (req, res) => {
//   try {
//     const role = req.user.role;
//     const userId = req.user.id;

//     let whereClause = {};
//     if (role === "patient") {
//       whereClause = { patient_id: userId, status_flag: 1 };
//     } else if (role === "doctor") {
//       whereClause = { doctor_id: userId, status_flag: 1 };
//     } else if (role === "admin") {
//       whereClause = { status_flag: 1 };
//     }

//     const medications = await Medication.findAll({ where: whereClause });
//     res.json(medications);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.deleteMedication = async (req, res) => {
//   const { id } = req.params;
//   const { role, id: userId } = req.user;

//   try {
//     const medication = await Medication.findByPk(id);
//     if (!medication) return res.status(404).json({ message: "Not found" });

//     if (
//       (role === "patient" && medication.patient_id !== userId) ||
//       (role === "doctor" && medication.doctor_id !== userId)
//     ) {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     await medication.update({ status_flag: 0 });
//     res.json({ message: "Medication deleted" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
