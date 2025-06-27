// routes/doctorRoutes.js
const express = require('express');
const doctorController = require('../controllers/doctorController'); // doctorController now handles chat methods too

const router = express.Router();

// Route for listing doctors
// GET /api/v1/chat/doctors?status=online
router.get('/doctors', doctorController.getDoctors);

// Route for doctor detail
// GET /api/v1/doctors/{doctorId}
router.get('/doctors/:doctorId', doctorController.getDoctorDetail);

// Route for starting a chat session (previously in routes/chatRoutes.js)
// POST /api/v1/chat/start-session
router.post('/start-session', doctorController.startChatSession);

// Route for sending a chat message
// POST /api/v1/chat/sessions/{sessionId}/send-message
router.post('/sessions/:sessionId/send-message', doctorController.sendChatMessage);

// Route for getting chat history
// GET /api/v1/chat/sessions/{sessionId}/history
router.get('/sessions/:sessionId/history', doctorController.getChatHistory);

// Route for doctor to confirm an appointment
// POST /api/v1/appointments/{appointmentId}/confirm-doctor
router.post('/appointments/:appointmentId/confirm-doctor', doctorController.confirmDoctorAppointment);

// Route to confirm final success status of an appointment
// GET /api/v1/appointments/{appointmentId}/success-status
router.get('/appointments/:appointmentId/success-status', doctorController.getAppointmentSuccessStatus);

// Route to retrieve upcoming appointments for the patient
// GET /api/v1/patient/appointments/upcoming
router.get('/patient/appointments/upcoming', doctorController.getUpcomingAppointmentsForPatient);

// Route to retrieve completed appointments for the patient
// GET /api/v1/patient/appointments/completed
router.get('/patient/appointments/completed', doctorController.getCompletedAppointmentsForPatient);

// Route to allow rescheduling of an existing appointment
// POST /api/v1/appointments/{appointmentId}/reschedule
router.post('/appointments/:appointmentId/reschedule', doctorController.rescheduleAppointment);

// Route to allow a patient to submit a review for a doctor
// POST /api/v1/doctors/{doctorId}/reviews
router.post('/doctors/:doctorId/reviews', doctorController.submitDoctorReview);

// Route to check if there are any upcoming appointments (for empty state UI)
// GET /api/v1/patient/appointments/upcoming/empty-status
router.get('/patient/appointments/upcoming/empty-status', doctorController.checkUpcomingAppointmentsEmpty);

// Route to check if there are any completed appointments (for empty state UI)
// GET /api/v1/patient/appointments/completed/empty-status
router.get('/patient/appointments/completed/empty-status', doctorController.checkCompletedAppointmentsEmpty);

module.exports = router;