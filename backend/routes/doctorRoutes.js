const express = require('express');
const doctorController = require('../controllers/doctorController');
const authorizeRoles = require('../middleware/roleMiddleware');
const authenticate= require('../middleware/authMiddleware')

const router = express.Router();

// GET /api/v1/chat/doctors?status=online
router.get('/doctors',authenticate, doctorController.getDoctors);
// GET /api/v1/doctors/{doctorId}
router.get('/doctors/:doctorId',authenticate, doctorController.getDoctorDetail);
// GET /api/v1/doctors/:doctorId/available-slots?date=YYYY-MM-DD
router.get('/doctors/:doctorId/available-slots',authenticate, doctorController.getAvailableTimeSlots);
// PATCH /api/v1/doctors/:doctorId/update-working-hours
router.patch('/doctors/:doctorId/update-working-hours',authenticate,authorizeRoles(['admin', 'doctor']),doctorController.updateDoctorAppointmentBookingTime);
// PATCH /api/v1/doctors/:doctorId/update-available-dates
router.patch('/doctors/:doctorId/update-available-dates',authenticate,authorizeRoles(['admin', 'doctor']),doctorController.updateDoctorManualDates);
// This operation typically requires an 'admin' or the 'doctor' themselves
router.post('/appointments/:appointmentId/confirm-doctor',authenticate,authorizeRoles(['admin', 'doctor']),doctorController.confirmDoctorAppointment);
router.get('/appointments/:appointmentId/success-status',authenticate, doctorController.getAppointmentSuccessStatus);
router.get('/patient/appointments/upcoming', doctorController.getUpcomingPatientAppointments);
router.get('/patient/appointments/completed', doctorController.getCompletedPatientAppointments);
router.patch('/patient/appointments/:appointmentId/reschedule',authenticate,authorizeRoles(['patient', 'admin']),doctorController.rescheduleAppointment);
router.post('/doctors/:doctorId/reviews',authenticate, doctorController.submitDoctorReview);
router.post('/calls/video/initiate',authenticate, doctorController.initiateVideoCall);
router.post('/calls/audio/initiate',authenticate, doctorController.initiateAudioCall);
router.post('/start-session',authenticate, authorizeRoles(['patient', 'doctor']), doctorController.startChatSession);
router.post('/sessions/:sessionId/send-message',authenticate, authorizeRoles(['patient', 'doctor']), doctorController.sendChatMessage);
router.get('/sessions/:sessionId/history',authenticate, authorizeRoles(['patient', 'doctor']), doctorController.getChatHistory);
router.get('/patient/appointments/upcoming/empty-status',authenticate, doctorController.getUpcomingPatientAppointmentsEmptyStatus);
router.get('/patient/appointments/completed/empty-status',authenticate, doctorController.getCompletedPatientAppointmentsEmptyStatus);


router.post('/doctors', authenticate, authorizeRoles(['admin']), doctorController.createDoctorProfile);
router.put('/doctors/:doctorId', authenticate, authorizeRoles(['admin', 'doctor']), doctorController.updateDoctorProfile);
router.patch('/doctors/:doctorId/update-status', authenticate, authorizeRoles(['admin', 'doctor']), doctorController.updateDoctorStatus);
router.patch('/doctors/:doctorId/auto-update-available-dates', authenticate, authorizeRoles(['admin', 'doctor']), doctorController.autoUpdateDoctorAvailableDates);
router.delete('/doctors/:doctorId/deactivate', authenticate, authorizeRoles(['admin']), doctorController.deactivateDoctorProfile);
router.patch('/doctors/:doctorId/reactivate', authenticate, authorizeRoles(['admin']), doctorController.reactivateDoctorProfile);


module.exports = router;