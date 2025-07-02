// routes/doctorRoutes.js
const express = require('express');
const doctorController = require('../controllers/doctorController');

const router = express.Router();

// Route for listing doctors
// GET /api/v1/chat/doctors?status=online
router.get('/doctors', doctorController.getDoctors);

// Route for doctor detail
// GET /api/v1/doctors/{doctorId}
router.get('/doctors/:doctorId', doctorController.getDoctorDetail);

// Route to get doctor's available time slots for a specific date
// GET /api/v1/doctors/:doctorId/available-slots?date=YYYY-MM-DD
router.get('/doctors/:doctorId/available-slots', doctorController.getAvailableTimeSlots);

// Route to manually update a doctor's standard working hours
// This would typically require authentication/authorization
// PATCH /api/v1/doctors/:doctorId/update-working-hours
router.patch('/doctors/:doctorId/update-working-hours', doctorController.updateDoctorWorkingHours);

// Route to manually update a doctor's specific available dates (e.g., add/remove vacation)
// This would typically require authentication/authorization
// PATCH /api/v1/doctors/:doctorId/update-available-dates
router.patch('/doctors/:doctorId/update-available-dates', doctorController.updateDoctorManualDates);


router.post('/appointments/:appointmentId/confirm-doctor', doctorController.confirmDoctorAppointment);
router.get('/appointments/:appointmentId/success-status', doctorController.getAppointmentSuccessStatus);

router.get('/patient/appointments/upcoming', doctorController.getUpcomingPatientAppointments);
router.get('/patient/appointments/completed', doctorController.getCompletedPatientAppointments);
router.patch('/patient/appointments/:appointmentId/reschedule', doctorController.rescheduleAppointment);
router.post('/doctors/:doctorId/reviews', doctorController.submitDoctorReview);
router.post('/calls/video/initiate', doctorController.initiateVideoCall);
router.post('/calls/audio/initiate', doctorController.initiateAudioCall);
router.post('/start-session', doctorController.startChatSession);
router.post('/sessions/:sessionId/send-message', doctorController.sendChatMessage);
router.get('/sessions/:sessionId/history', doctorController.getChatHistory);
router.get('/patient/appointments/upcoming/empty-status', doctorController.getUpcomingPatientAppointmentsEmptyStatus);
router.get('/patient/appointments/completed/empty-status', doctorController.getCompletedPatientAppointmentsEmptyStatus);

module.exports = router;