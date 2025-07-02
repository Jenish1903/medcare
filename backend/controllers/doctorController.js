// D:\medicare\backend\controllers\doctorController.js
const Doctor = require('../models/doctorModel');
const AppError = require('../utils/appError');
const moment = require('moment');

function formatDatesForImageUI(availableDatesArray) {
    if (!Array.isArray(availableDatesArray)) {
        return [];
    }
    const futureAndCurrentDates = availableDatesArray.filter(dateStr => moment(dateStr).isSameOrAfter(moment(), 'day'));

    return futureAndCurrentDates.map(dateString => {
        const date = moment(dateString, 'YYYY-MM-DD');
        return date.format('ddd DD');
    });
}

exports.getDoctors = async (req, res, next) => {
    try {
        const { status, limit = 10, offset = 0 } = req.query;
        let doctorStatus = undefined;
        if (status === 'online') {
            doctorStatus = 1;
        } else if (status === 'offline') {
            doctorStatus = 0;
        }

        const doctors = await Doctor.getAllDoctors(doctorStatus, parseInt(limit), parseInt(offset));

        if (!doctors || doctors.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No doctors found.',
                data: []
            });
        }

        const formattedDoctors = doctors.map(doctor => ({
            doctorId: doctor.doctorId,
            image: doctor.image,
            name: doctor.name,
            specialist: doctor.specialist,
            experience: doctor.experience ? doctor.experience.toString() : 'N/A',
            availableDates: formatDatesForImageUI(doctor.availableDates),
            status: doctor.status === 1 ? 'online' : 'offline',
            reviews: doctor.reviews
        }));

        res.status(200).json({
            status: 'success',
            results: formattedDoctors.length,
            data: formattedDoctors
        });
    } catch (error) {
        next(new AppError(`Failed to retrieve doctors: ${error.message}`, 500));
    }
};

exports.getDoctorDetail = async (req, res, next) => {
    try {
        const { doctorId } = req.params;

        if (isNaN(parseInt(doctorId))) {
            return next(new AppError('Invalid Doctor ID provided.', 400));
        }

        const doctor = await Doctor.getDoctorById(parseInt(doctorId));

        if (!doctor) {
            return next(new AppError('Doctor not found with that ID.', 404));
        }

        doctor.availableDates = formatDatesForImageUI(doctor.availableDates);

        res.status(200).json({
            status: 'success',
            data: doctor
        });
    } catch (error) {
        next(new AppError(`Failed to retrieve doctor details: ${error.message}`, 500));
    }
};

exports.getAvailableTimeSlots = async (req, res, next) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;

        if (isNaN(parseInt(doctorId))) {
            return next(new AppError('Invalid Doctor ID provided.', 400));
        }
        if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
            return next(new AppError('Invalid or missing date parameter. Please useYYYY-MM-DD format.', 400));
        }

        const availableSlots = await Doctor.getAvailableSlotsForDate(parseInt(doctorId), date);

        res.status(200).json({
            status: 'success',
            date: date,
            doctorId: parseInt(doctorId),
            availableSlots: availableSlots
        });

    } catch (error) {
        next(new AppError(`Failed to retrieve available slots: ${error.message}`, 500));
    }
};

exports.updateDoctorWorkingHours = async (req, res, next) => {
    try {
        const { doctorId } = req.params;
        const { workingHours } = req.body;

        if (isNaN(parseInt(doctorId))) {
            return next(new AppError('Invalid Doctor ID provided.', 400));
        }
        if (!Array.isArray(workingHours) || workingHours.some(slot => typeof slot !== 'string')) {
            return next(new AppError('Invalid workingHours format. Must be an array of strings.', 400));
        }

        await Doctor.updateWorkingHours(parseInt(doctorId), workingHours);

        res.status(200).json({
            status: 'success',
            message: 'Doctor working hours updated successfully.'
        });
    } catch (error) {
        console.error('Error in updateDoctorWorkingHours:', error);
        next(new AppError(`Failed to update doctor working hours: ${error.message}`, 500));
    }
};

exports.updateDoctorManualDates = async (req, res, next) => {
    let action = '';
    try {
        const { doctorId } = req.params;
        const { date, action: requestedAction } = req.body;

        action = requestedAction;

        if (isNaN(parseInt(doctorId))) {
            return next(new AppError('Invalid Doctor ID provided.', 400));
        }
        if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
            return next(new AppError('Invalid or missing date parameter. Please useYYYY-MM-DD format.', 400));
        }
        if (!['add', 'remove'].includes(action)) {
            return next(new AppError('Invalid action. Must be "add" or "remove".', 400));
        }

        await Doctor.manageSpecificAvailableDate(parseInt(doctorId), date, action);

        res.status(200).json({
            status: 'success',
            message: `Doctor available date ${action}ed successfully.`
        });
    } catch (error) {
        console.error('Error in updateDoctorManualDates:', error);
        next(new AppError(`Failed to ${action || 'perform action on'} doctor's available date: ${error.message}`, 500));
    }
};

exports.confirmDoctorAppointment = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { doctorId, status } = req.body;

        const doctorUserId = parseInt(doctorId);
        if (isNaN(doctorUserId)) {
            return next(new AppError('Invalid Doctor ID provided in request body.', 400));
        }

        if (isNaN(parseInt(appointmentId))) {
            return next(new AppError('Invalid Appointment ID provided.', 400));
        }
        if (!status || !['confirmed', 'cancelled', 'completed'].includes(status.toLowerCase())) {
            return next(new AppError('Invalid or missing status. Must be "confirmed", "cancelled", or "completed".', 400));
        }

        const updatedAppointment = await Doctor.confirmAppointmentByDoctor(
            parseInt(appointmentId),
            doctorUserId,
            status.toLowerCase()
        );

        if (!updatedAppointment) {
            return next(new AppError('Appointment not found or unable to confirm.', 404));
        }

        res.status(200).json({
            status: 'success',
            message: `Appointment ${status.toLowerCase()} successfully.`,
            data: updatedAppointment
        });
    } catch (error) {
        console.error('Error in confirmDoctorAppointment:', error);
        next(new AppError(`Failed to confirm appointment: ${error.message}`, 500));
    }
};

exports.getAppointmentSuccessStatus = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;

        if (isNaN(parseInt(appointmentId))) {
            return next(new AppError('Invalid Appointment ID provided.', 400));
        }

        const appointmentDetails = await Doctor.getAppointmentDetails(parseInt(appointmentId));

        if (!appointmentDetails) {
            return next(new AppError('Appointment not found.', 404));
        }

        const combinedDateTime = `${moment(appointmentDetails.appointmentDate).format('YYYY-MM-DD')} ${appointmentDetails.appointmentTime}`;
        const formattedTime = moment(combinedDateTime, 'YYYY-MM-DD hh:mm A').toISOString();

        res.status(200).json({
            status: 'success',
            details: {
                appointmentId: appointmentDetails.appointmentId,
                doctor: appointmentDetails.doctorName,
                patient: appointmentDetails.patientName,
                time: formattedTime,
                status: appointmentDetails.status,
                clinicName: appointmentDetails.clinicName,
                clinicLocation: appointmentDetails.clinicLocation
            }
        });
    } catch (error) {
        console.error('Error in getAppointmentSuccessStatus:', error);
        next(new AppError(`Failed to retrieve appointment success status: ${error.message}`, 500));
    }
};

exports.getUpcomingPatientAppointments = async (req, res, next) => {
    try {
        // If patientId is provided, parse it; otherwise, it will be undefined.
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

        // Only validate if patientId was actually provided in the query string
        if (req.query.patientId && isNaN(patientId)) {
            return next(new AppError('Patient ID must be a valid number if provided.', 400));
        }

        // Pass patientId (which can be undefined) to the Doctor model
        const appointments = await Doctor.getPatientAppointments(patientId, 'upcoming');

        const formattedAppointments = appointments.map(app => ({
            appointmentId: app.appointmentId,
            doctorName: app.doctorName,
            specialist: app.specialist,
            "Working Hours": app.appointmentTime,
            Schedule: moment(app.appointmentDate).format('ddd'),
            "Clinic Location": app.clinicLocation
        }));

        res.status(200).json({
            status: 'success',
            results: formattedAppointments.length,
            data: formattedAppointments
        });
    } catch (error) {
        console.error('Error in getUpcomingPatientAppointments:', error);
        next(new AppError(`Failed to retrieve upcoming appointments: ${error.message}`, 500));
    }
};

exports.getCompletedPatientAppointments = async (req, res, next) => {
    try {
        // If patientId is provided, parse it; otherwise, it will be undefined.
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

        // Only validate if patientId was actually provided in the query string
        if (req.query.patientId && isNaN(patientId)) {
            return next(new AppError('Patient ID must be a valid number if provided.', 400));
        }

        // Pass patientId (which can be undefined) to the Doctor model
        const appointments = await Doctor.getPatientAppointments(patientId, 'completed');

        const formattedAppointments = appointments.map(app => ({
            appointmentId: app.appointmentId,
            doctorName: app.doctorName,
            specialist: app.specialist,
            "Working Hours": app.appointmentTime,
            Schedule: moment(app.appointmentDate).format('ddd'),
            "Clinic Location": app.clinicLocation
        }));

        res.status(200).json({
            status: 'success',
            results: formattedAppointments.length,
            data: formattedAppointments
        });
    } catch (error) {
        console.error('Error in getCompletedPatientAppointments:', error);
        next(new AppError(`Failed to retrieve completed appointments: ${error.message}`, 500));
    }
};


exports.rescheduleAppointment = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { newDateTime } = req.body;
        // If patientId is provided in the query, parse it; otherwise, it will be undefined.
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

        // Validate patientId only if it was actually provided in the query string
        if (req.query.patientId && isNaN(patientId)) {
            return next(new AppError('Patient ID must be a valid number if provided.', 400));
        }

        if (isNaN(parseInt(appointmentId))) {
            return next(new AppError('Invalid Appointment ID provided.', 400));
        }

        if (!newDateTime || !moment(newDateTime).isValid()) {
            return next(new AppError('Invalid or missing newDateTime. Use ISO 8601 format (e.g., 2025-07-22T14:00:00Z).', 400));
        }

        const newDate = moment(newDateTime).format('YYYY-MM-DD');
        const newTime = moment(newDateTime).format('hh:mm A');

        // Pass patientId (which can be undefined) to the Doctor model
        // Note: The `Doctor.rescheduleAppointment` static method currently requires `patientId` as a mandatory argument.
        // If you want to make patientId optional in the reschedule, you will need to update the static method's signature
        // and its internal logic (e.g., the SQL query for `tbl_appointments` to not filter by patientId if it's undefined).
        // For now, if patientId is undefined here, it will result in an error or unexpected behavior if the Doctor method expects it.
        // Assuming that for rescheduling, patientId is likely always provided and relevant for security/ownership.
        if (patientId === undefined) {
             return next(new AppError('Patient ID is required for rescheduling an appointment.', 400));
        }

        const success = await Doctor.rescheduleAppointment(parseInt(appointmentId), patientId, newDate, newTime);

        if (!success) {
            return next(new AppError('Failed to reschedule appointment. It might not exist, belong to this patient, or the new slot is unavailable.', 400));
        }

        res.status(200).json({
            status: 'success',
            message: 'Appointment rescheduled successfully'
        });

    } catch (error) {
        console.error('Error in rescheduleAppointment:', error);
        next(new AppError(`Failed to reschedule appointment: ${error.message}`, 500));
    }
};

exports.submitDoctorReview = async (req, res, next) => {
    try {
        const { doctorId } = req.params;
        const { patientId, rating, comment } = req.body;

        // --- Input Validation ---
        if (isNaN(parseInt(doctorId))) {
            return next(new AppError('Invalid Doctor ID provided.', 400));
        }
        // Validate patientId as integer
        const parsedPatientId = parseInt(patientId);
        if (isNaN(parsedPatientId)) {
            return next(new AppError('Patient ID is required and must be a valid number.', 400));
        }

        if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return next(new AppError('Rating is required and must be a number between 1 and 5.', 400));
        }
        if (!comment || typeof comment !== 'string' || comment.trim() === '') {
            return next(new AppError('Comment is required and must be a non-empty string.', 400));
        }

        // Call the Doctor model method to add the review and update doctor stats
        const reviewId = await Doctor.addDoctorReview(parseInt(doctorId), parsedPatientId, rating, comment);

        res.status(201).json({ // 201 Created for successful resource creation
            status: 'success',
            message: 'Review submitted successfully',
            reviewId: reviewId
        });

    } catch (error) {
        console.error('Error in submitDoctorReview:', error);
        next(new AppError(`Failed to submit review: ${error.message}`, 500));
    }
};

exports.initiateVideoCall = async (req, res, next) => {
    try {
        const { sessionId, callerId, calleeId } = req.body;

        // Basic validation
        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            return next(new AppError('Session ID is required.', 400));
        }
        const parsedCallerId = parseInt(callerId);
        if (isNaN(parsedCallerId)) {
            return next(new AppError('Caller ID is required and must be a valid number.', 400));
        }
        if (!calleeId || typeof calleeId !== 'string' || calleeId.trim() === '') {
            return next(new AppError('Callee ID is required.', 400));
        }

        const callDetails = await Doctor.initiateVideoCall(sessionId, parsedCallerId, calleeId);

        res.status(200).json({
            status: 'success',
            message: 'Video call initiated successfully',
            data: callDetails
        });
    } catch (error) {
        console.error('Error in initiateVideoCall:', error);
        next(new AppError(`Failed to initiate video call: ${error.message}`, 500));
    }
};

exports.initiateAudioCall = async (req, res, next) => {
    try {
        const { sessionId, callerId, calleeId } = req.body;

        // Basic validation
        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            return next(new AppError('Session ID is required.', 400));
        }
        const parsedCallerId = parseInt(callerId);
        if (isNaN(parsedCallerId)) {
            return next(new AppError('Caller ID is required and must be a valid number.', 400));
        }
        if (!calleeId || typeof calleeId !== 'string' || calleeId.trim() === '') {
            return next(new AppError('Callee ID is required.', 400));
        }

        const callDetails = await Doctor.initiateAudioCall(sessionId, parsedCallerId, calleeId);

        res.status(200).json({
            status: 'success',
            message: 'Audio call initiated successfully',
            data: callDetails
        });
    } catch (error) {
        console.error('Error in initiateAudioCall:', error);
        next(new AppError(`Failed to initiate audio call: ${error.message}`, 500));
    }
};

exports.startChatSession = async (req, res, next) => {
    try {
        const { doctorId, patientId } = req.body;

        // Validate inputs
        const parsedDoctorId = parseInt(doctorId);
        const parsedPatientId = parseInt(patientId);

        if (isNaN(parsedDoctorId)) {
            return next(new AppError('Doctor ID must be a valid number.', 400));
        }
        if (isNaN(parsedPatientId)) {
            return next(new AppError('Patient ID must be a valid number.', 400));
        }

        const sessionResult = await Doctor.startChatSession(parsedDoctorId, parsedPatientId);

        if (sessionResult.message && sessionResult.message.includes('Active chat session already exists')) {
            // If session already exists, return 200 OK with the existing session ID
            res.status(200).json({
                status: 'success',
                message: sessionResult.message,
                sessionId: sessionResult.sessionId,
                timestamp: sessionResult.timestamp
            });
        } else {
            // For a newly created session, return 201 Created
            res.status(201).json({
                status: 'success',
                message: sessionResult.message,
                sessionId: sessionResult.sessionId,
                timestamp: sessionResult.timestamp
            });
        }

    } catch (error) {
        console.error('Error in startChatSession:', error);
        next(new AppError(`Failed to start chat session: ${error.message}`, 500));
    }
};

exports.sendChatMessage = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { senderId, message } = req.body;

        // Validate inputs
        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            return next(new AppError('Session ID is required and must be a non-empty string.', 400));
        }
        const parsedSenderId = parseInt(senderId);
        if (isNaN(parsedSenderId)) {
            return next(new AppError('Sender ID is required and must be a valid number.', 400));
        }
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return next(new AppError('Message content is required and cannot be empty.', 400));
        }

        const messageResult = await Doctor.sendChatMessage(sessionId, parsedSenderId, message);

        res.status(201).json({
            status: 'success',
            message: 'Message sent successfully',
            messageId: messageResult.messageId,
            timestamp: messageResult.timestamp
        });

    } catch (error) {
        console.error('Error in sendChatMessage:', error);
        next(new AppError(`Failed to send message: ${error.message}`, 500));
    }
};

exports.getChatHistory = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { before, limit } = req.query; // 'before' is a timestamp, 'limit' is an integer

        // Validate inputs
        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            return next(new AppError('Session ID is required and must be a non-empty string.', 400));
        }
        if (limit && isNaN(parseInt(limit))) {
            return next(new AppError('Limit must be a valid number.', 400));
        }
        // 'before' validation is handled in the model, but a quick check here doesn't hurt
        if (before && !moment(before).isValid()) {
            return next(new AppError('Invalid "before" timestamp format. Use ISO 8601.', 400));
        }

        const history = await Doctor.getChatHistory(sessionId, before, limit ? parseInt(limit) : undefined);

        res.status(200).json({
            status: 'success',
            results: history.length,
            data: history
        });

    } catch (error) {
        console.error('Error in getChatHistory:', error);
        next(new AppError(`Failed to retrieve chat history: ${error.message}`, 500));
    }
};

exports.getUpcomingPatientAppointmentsEmptyStatus = async (req, res, next) => {
    try {
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

        if (req.query.patientId && isNaN(patientId)) {
            return next(new AppError('Patient ID must be a valid number if provided.', 400));
        }

        const hasAppointments = await Doctor.hasUpcomingAppointments(patientId);

        res.status(200).json({
            isEmpty: !hasAppointments,
            message: hasAppointments ? "Upcoming appointments found." : "No upcoming appointments"
        });
    } catch (error) {
        console.error('Error in getUpcomingPatientAppointmentsEmptyStatus:', error);
        next(new AppError(`Failed to check upcoming appointments empty status: ${error.message}`, 500));
    }
};


exports.getCompletedPatientAppointmentsEmptyStatus = async (req, res, next) => {
    try {
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

        if (req.query.patientId && isNaN(patientId)) {
            return next(new AppError('Patient ID must be a valid number if provided.', 400));
        }

        const hasAppointments = await Doctor.hasCompletedAppointments(patientId);

        res.status(200).json({
            isEmpty: !hasAppointments,
            message: hasAppointments ? "Completed appointments found." : "No completed appointments"
        });
    } catch (error) {
        console.error('Error in getCompletedPatientAppointmentsEmptyStatus:', error);
        next(new AppError(`Failed to check completed appointments empty status: ${error.message}`, 500));
    }
};