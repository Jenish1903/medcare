// D:\medicare\backend\controllers\doctorController.js
const moment = require('moment');
const AppError = require('../utils/appError');
const catchAsync = require('../middleware/catchAsync');
const responseTemplate = require('../utils/responseTemplate');

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

function generateRtcToken(channelName, userId, role = 'publisher', expireTime = 3600) {
    console.warn("Using dummy RTC token generation. Replace with a secure method for production!");
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTime;
    return `dummy_rtc_token_for_channel_${channelName}_user_${userId}_expires_${privilegeExpiredTs}`;
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

        const doctors = await DoctorRepository.getAllDoctors(doctorStatus, parseInt(limit), parseInt(offset));

        if (!doctors || doctors.length === 0) {
            return res.status(200).json(responseTemplate.success('No doctors found.', []));
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

        res.status(200).json(responseTemplate.success('Doctors retrieved successfully', formattedDoctors));
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

        const doctor = await DoctorRepository.getDoctorById(parseInt(doctorId));

        if (!doctor) {
            return res.status(404).json(responseTemplate.notFound('Doctor not found with that ID.'));
        }

        doctor.availableDates = formatDatesForImageUI(doctor.availableDates);

        res.status(200).json(responseTemplate.success('Doctor details retrieved successfully', doctor));
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
            return next(new AppError('Invalid or missing date parameter. Please use YYYY-MM-DD format.', 400));
        }

        const availableSlots = await DoctorRepository.getAvailableSlotsForDate(parseInt(doctorId), date);

        res.status(200).json(responseTemplate.success('Available time slots retrieved successfully', { date, doctorId: parseInt(doctorId), availableSlots }));

    } catch (error) {
        next(new AppError(`Failed to retrieve available slots: ${error.message}`, 500));
    }
};

exports.updateDoctorAppointmentBookingTime = async (req, res, next) => {
    try {
        const { doctorId } = req.params;
        const { appointmentBookingTime } = req.body; // Changed from workingHours

        if (isNaN(parseInt(doctorId))) {
            return next(new AppError('Invalid Doctor ID provided.', 400));
        }
        if (!Array.isArray(appointmentBookingTime) || appointmentBookingTime.some(slot => typeof slot !== 'string')) { // Changed from workingHours
            return next(new AppError('Invalid appointmentBookingTime format. Must be an array of strings.', 400)); // Changed message
        }

        await DoctorRepository.updateAppointmentBookingTime(parseInt(doctorId), appointmentBookingTime); // Changed method call

        res.status(200).json(responseTemplate.success('Doctor appointment booking time updated successfully.')); // Changed message
    } catch (error) {
        console.error('Error in updateDoctorAppointmentBookingTime:', error); // Changed message
        next(new AppError(`Failed to update doctor appointment booking time: ${error.message}`, 500)); // Changed message
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
            return next(new AppError('Invalid or missing date parameter. Please use YYYY-MM-DD format.', 400));
        }
        if (!['add', 'remove'].includes(action)) {
            return next(new AppError('Invalid action. Must be "add" or "remove".', 400));
        }

        await DoctorRepository.manageSpecificAvailableDate(parseInt(doctorId), date, action);

        res.status(200).json(responseTemplate.success(`Doctor available date ${action}ed successfully.`));
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

        const updatedAppointment = await AppointmentRepository.confirmAppointmentByDoctor(
            parseInt(appointmentId),
            doctorUserId,
            status.toLowerCase()
        );

        if (!updatedAppointment) {
            return res.status(404).json(responseTemplate.notFound('Appointment not found or unable to confirm.'));
        }

        res.status(200).json(responseTemplate.success(`Appointment ${status.toLowerCase()} successfully.`, updatedAppointment));
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

        const appointmentDetails = await AppointmentRepository.getAppointmentById(parseInt(appointmentId));

        if (!appointmentDetails) {
            return res.status(404).json(responseTemplate.notFound('Appointment not found.'));
        }

        const combinedDateTime = `${moment(appointmentDetails.appointmentDate).format('YYYY-MM-DD')} ${appointmentDetails.appointmentTime}`;
        const formattedTime = moment(combinedDateTime, 'YYYY-MM-DD hh:mm A').toISOString();

        res.status(200).json(responseTemplate.success('Appointment status retrieved successfully', {
            appointmentId: appointmentDetails.appointmentId,
            doctor: appointmentDetails.doctorName,
            patient: appointmentDetails.patientName,
            time: formattedTime,
            status: appointmentDetails.status,
            clinicName: appointmentDetails.clinicName,
            clinicLocation: appointmentDetails.clinicLocation
        }));
    } catch (error) {
        console.error('Error in getAppointmentSuccessStatus:', error);
        next(new AppError(`Failed to retrieve appointment success status: ${error.message}`, 500));
    }
};

exports.getUpcomingPatientAppointments = async (req, res, next) => {
    try {
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

        if (req.query.patientId && isNaN(patientId)) {
            return next(new AppError('Patient ID must be a valid number if provided.', 400));
        }

        const appointments = await AppointmentRepository.getUserAppointments(
            patientId, // Will be undefined if not provided
            'patient',
            ['pending', 'confirmed', 'scheduled'],
            false
        );

        const formattedAppointments = appointments.map(app => ({
            appointmentId: app.id, // <-- USE app.id here, since it's not renamed in the repo
            doctorName: app.doctorName,
            specialist: app.doctorSpecialist,
            "Working Hours": app.appointmentTime,
            Schedule: moment(app.appointmentDate).format('ddd'),
            "Clinic Location": app.clinicLocation
        }));

        res.status(200).json(responseTemplate.success('Upcoming patient appointments retrieved successfully', formattedAppointments));
    } catch (error) {
        console.error('Error in getUpcomingPatientAppointments:', error);
        next(new AppError(`Failed to retrieve upcoming appointments: ${error.message}`, 500));
    }
};

exports.getCompletedPatientAppointments = async (req, res, next) => {
    try {
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

        // Ensure this mandatory check is REMOVED if you want to fetch ALL appointments without an ID
        // if (!patientId) {
        //      return next(new AppError('Patient ID is required for fetching patient appointments.', 400));
        // }

        if (req.query.patientId && isNaN(patientId)) {
            return next(new AppError('Patient ID must be a valid number if provided.', 400));
        }

        const appointments = await AppointmentRepository.getUserAppointments(
            patientId, // Will be undefined if not provided
            'patient',
            'completed',
            true
        );

        const formattedAppointments = appointments.map(app => ({
            appointmentId: app.id, // <-- USE app.id here
            doctorName: app.doctorName,
            specialist: app.doctorSpecialist,
            "Working Hours": app.appointmentTime,
            Schedule: moment(app.appointmentDate).format('ddd'),
            "Clinic Location": app.clinicLocation
        }));

        res.status(200).json(responseTemplate.success('Completed patient appointments retrieved successfully', formattedAppointments));
    } catch (error) {
        console.error('Error in getCompletedPatientAppointments:', error);
        next(new AppError(`Failed to retrieve completed appointments: ${error.message}`, 500));
    }
};

exports.rescheduleAppointment = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { newDateTime } = req.body;
        const patientId = req.query.patientId ? parseInt(req.query.patientId) : undefined;

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

        if (patientId === undefined) {
            return next(new AppError('Patient ID is required for rescheduling an appointment.', 400));
        }

        const success = await AppointmentRepository.rescheduleAppointment(
            parseInt(appointmentId),
            patientId, // Patient ID for ownership verification
            newDate,
            newTime,
            patientId
        );

        if (!success) {
            return res.status(400).json(responseTemplate.error('Failed to reschedule appointment. It might not exist, belong to this patient, or the new slot is unavailable.'));
        }

        res.status(200).json(responseTemplate.success('Appointment rescheduled successfully'));

    } catch (error) {
        console.error('Error in rescheduleAppointment:', error);
        next(new AppError(`Failed to reschedule appointment: ${error.message}`, 500));
    }
};

exports.submitDoctorReview = async (req, res, next) => {
    try {
        const { doctorId } = req.params; // doctorId comes from URL param
        const { patientId, rating, comment } = req.body; // These come from request body

        // --- Input Validation ---
        if (isNaN(parseInt(doctorId))) {
            return next(new AppError('Invalid Doctor ID provided.', 400));
        }
        const parsedDoctorId = parseInt(doctorId); // Use parsedDoctorId consistently

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

        // --- Call the Repository method ---
        // Prepare the reviewData object as expected by DoctorReviewRepository.createReview
        const reviewData = {
            doctorId: parsedDoctorId, // Use parsedDoctorId here
            patientId: parsedPatientId,
            rating: rating,
            comment: comment
        };

        // Call createReview (assuming you renamed addReview to createReview as recommended)
        const newReviewObject = await DoctorReviewRepository.createReview(
            reviewData,           // First argument: reviewData object
            parsedPatientId      // Second argument: createdByUserId
        );

        // --- Send Response ---
        res.status(201).json(responseTemplate.success('Review submitted successfully', { reviewId: newReviewObject.reviewId }));

    } catch (error) {
        console.error('Error in submitDoctorReview:', error);
        next(new AppError(`Failed to submit review: ${error.message}`, 500));
    }
};

exports.initiateVideoCall = async (req, res, next) => {
    try {
        const { sessionId, callerId, calleeId } = req.body;
        const io = req.io; // Access the Socket.IO instance

        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            return next(new AppError('Session ID is required.', 400));
        }
        const parsedCallerId = parseInt(callerId);
        if (isNaN(parsedCallerId)) {
            return next(new AppError('Caller ID is required and must be a valid number.', 400));
        }
        const parsedCalleeId = parseInt(calleeId); // Ensure calleeId is parsed if it's coming as a number string
        if (isNaN(parsedCalleeId)) {
            return next(new AppError('Callee ID is required and must be a valid number.', 400));
        }

        // Generate an RTC token for the call
        // The channelName could be the sessionId or a unique callId
        const channelName = sessionId; // Using sessionId as channelName for simplicity
        const rtcToken = generateRtcToken(channelName, parsedCallerId); // Generate token for the caller

        const callDetails = await CallRepository.createCall({
            sessionId,
            callerId: parsedCallerId,
            calleeId: parsedCalleeId.toString(), // Store as string if VARCHAR
            type: 'video',
            rtcToken: rtcToken // Save the generated token
        });

        // Notify the callee about the incoming call via Socket.IO
        // We emit to the callee's specific room
        io.to(parsedCalleeId.toString()).emit('incomingCall', {
            callId: callDetails.callId,
            sessionId: callDetails.sessionId,
            callerId: callDetails.callerId,
            callerName: req.user.name, // Assuming req.user has caller's name from verifyToken
            type: 'video',
            rtcToken: callDetails.rtcToken // Send token to callee as well (for their client-side setup)
        });

        res.status(200).json(responseTemplate.success('Video call initiated successfully', callDetails));
    } catch (error) {
        console.error('Error in initiateVideoCall:', error);
        next(new AppError(`Failed to initiate video call: ${error.message}`, 500));
    }
};

exports.initiateAudioCall = async (req, res, next) => {
    try {
        const { sessionId, callerId, calleeId } = req.body;
        const io = req.io; // Access the Socket.IO instance

        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            return next(new AppError('Session ID is required.', 400));
        }
        const parsedCallerId = parseInt(callerId);
        if (isNaN(parsedCallerId)) {
            return next(new AppError('Caller ID is required and must be a valid number.', 400));
        }
        const parsedCalleeId = parseInt(calleeId); // Ensure calleeId is parsed if it's coming as a number string
        if (isNaN(parsedCalleeId)) {
            return next(new AppError('Callee ID is required and must be a valid number.', 400));
        }

        // Generate an RTC token for the call
        const channelName = sessionId;
        const rtcToken = generateRtcToken(channelName, parsedCallerId);

        const callDetails = await CallRepository.createCall({
            sessionId,
            callerId: parsedCallerId,
            calleeId: parsedCalleeId.toString(), // Ensure calleeId is string if VARCHAR in DB
            type: 'audio',
            rtcToken: rtcToken // Save the generated token
        });

        // Notify the callee about the incoming call via Socket.IO
        io.to(parsedCalleeId.toString()).emit('incomingCall', {
            callId: callDetails.callId,
            sessionId: callDetails.sessionId,
            callerId: callDetails.callerId,
            callerName: req.user.name,
            type: 'audio',
            rtcToken: callDetails.rtcToken
        });

        res.status(200).json(responseTemplate.success('Audio call initiated successfully', callDetails));
    } catch (error) {
        console.error('Error in initiateAudioCall:', error);
        next(new AppError(`Failed to initiate audio call: ${error.message}`, 500));
    }
};

exports.startChatSession = async (req, res, next) => {
    try {
        const { doctorId, patientId } = req.body;

        const parsedDoctorId = parseInt(doctorId);
        const parsedPatientId = parseInt(patientId);

        if (isNaN(parsedDoctorId)) {
            return next(new AppError('Doctor ID must be a valid number.', 400));
        }
        if (isNaN(parsedPatientId)) {
            return next(new AppError('Patient ID must be a valid number.', 400));
        }

        const sessionResult = await ChatSessionRepository.startChatSession(parsedDoctorId, parsedPatientId);

        if (sessionResult.message && sessionResult.message.includes('Active chat session already exists')) {
            res.status(200).json(responseTemplate.success(sessionResult.message, {
                sessionId: sessionResult.session.sessionId,
                timestamp: sessionResult.session.started_at
            }));
        } else {
            res.status(201).json(responseTemplate.success(sessionResult.message, {
                sessionId: sessionResult.session.sessionId,
                timestamp: sessionResult.session.started_at
            }));
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

        const messageResult = await ChatMessageRepository.addMessage(sessionId, parsedSenderId, message);

        res.status(201).json(responseTemplate.success('Message sent successfully', {
            messageId: messageResult.messageId,
            timestamp: messageResult.timestamp
        }));

    } catch (error) {
        console.error('Error in sendChatMessage:', error);
        next(new AppError(`Failed to send message: ${error.message}`, 500));
    }
};

exports.getChatHistory = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { before, limit } = req.query;

        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
            return next(new AppError('Session ID is required and must be a non-empty string.', 400));
        }
        if (limit && isNaN(parseInt(limit))) {
            return next(new AppError('Limit must be a valid number.', 400));
        }

        let parsedLimit = undefined; 

        if (limit) {
            parsedLimit = parseInt(limit);
            if (isNaN(parsedLimit)) {
                return next(new AppError('Limit must be a valid number.', 400));
            }
        }

        if (before && !moment(before).isValid()) {
            return next(new AppError('Invalid "before" timestamp format. Use ISO 8601.', 400));
        }

        const history = await ChatMessageRepository.getMessagesBySession(sessionId, before, parsedLimit);

        res.status(200).json(responseTemplate.success('Chat history retrieved successfully', history));

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

        const hasAppointments = await AppointmentRepository.hasUpcomingAppointments(patientId);

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

        const hasAppointments = await AppointmentRepository.hasCompletedAppointments(patientId);

        res.status(200).json({
            isEmpty: !hasAppointments,
            message: hasAppointments ? "Completed appointments found." : "No completed appointments"
        });
    } catch (error) {
        console.error('Error in getCompletedPatientAppointmentsEmptyStatus:', error);
        next(new AppError(`Failed to check completed appointments empty status: ${error.message}`, 500));
    }
};





exports.createDoctorProfile = catchAsync(async (req, res, next) => {
    const doctorData = req.body; // Expects userId, image, specialist, etc.
    const createdByUserId = req.user.id; // Assuming `req.user.id` is the ID of the admin creating the profile

    if (!doctorData.userId) {
        return next(new AppError('User ID is required to create a doctor profile.', 400));
    }

    const newDoctor = await DoctorRepository.createDoctor({ ...doctorData, create_user: createdByUserId, update_user: createdByUserId });

    res.status(201).json(responseTemplate.success('Doctor profile created successfully', newDoctor));
});

exports.updateDoctorProfile = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;
    const updates = req.body;
    const updatedByUserId = req.user.id; // User making the update

    if (isNaN(parseInt(doctorId))) {
        return next(new AppError('Invalid Doctor ID provided.', 400));
    }

    // Basic validation for updates (can be more detailed)
    if (Object.keys(updates).length === 0) {
        return next(new AppError('No update data provided.', 400));
    }

    const success = await DoctorRepository.updateDoctorProfile(parseInt(doctorId), updates, updatedByUserId);

    if (!success) {
        return res.status(404).json(responseTemplate.notFound('Doctor not found or no changes applied.'));
    }

    res.status(200).json(responseTemplate.success('Doctor profile updated successfully.'));
});

exports.updateDoctorStatus = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;
    const { status } = req.body; // Expects status: 0 (offline) or 1 (online)
    const updatedByUserId = req.user.id;

    if (isNaN(parseInt(doctorId))) {
        return next(new AppError('Invalid Doctor ID provided.', 400));
    }

    if (typeof status !== 'number' || (status !== 0 && status !== 1)) {
        return next(new AppError('Invalid status value. Must be 0 (offline) or 1 (online).', 400));
    }

    const success = await DoctorRepository.updateDoctorStatus(parseInt(doctorId), status, updatedByUserId);

    if (!success) {
        return res.status(404).json(responseTemplate.notFound('Doctor not found or status already set.'));
    }

    res.status(200).json(responseTemplate.success('Doctor status updated successfully.'));
});

exports.autoUpdateDoctorAvailableDates = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;
    const { daysAhead } = req.body; // Optional: specify number of days, defaults to 60 in repo
    const updatedByUserId = req.user.id;

    if (isNaN(parseInt(doctorId))) {
        return next(new AppError('Invalid Doctor ID provided.', 400));
    }

    if (daysAhead !== undefined && (isNaN(parseInt(daysAhead)) || parseInt(daysAhead) <= 0)) {
        return next(new AppError('Invalid daysAhead value. Must be a positive number.', 400));
    }

    const success = await DoctorRepository.updateDoctorAvailableDates(parseInt(doctorId), parseInt(daysAhead) || undefined, updatedByUserId);

    if (!success) {
        return res.status(404).json(responseTemplate.notFound('Doctor not found or dates could not be updated.'));
    }

    res.status(200).json(responseTemplate.success('Doctor available dates automatically updated.'));
});

exports.deactivateDoctorProfile = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;
    const deletedByUserId = req.user.id; // User performing the deactivation (e.g., admin)

    if (isNaN(parseInt(doctorId))) {
        return next(new AppError('Invalid Doctor ID provided.', 400));
    }

    const success = await DoctorRepository.deactivateDoctorProfile(parseInt(doctorId), deletedByUserId);

    if (!success) {
        return res.status(404).json(responseTemplate.notFound('Doctor not found or already deactivated.'));
    }

    res.status(200).json(responseTemplate.success('Doctor profile deactivated successfully.'));
});

exports.reactivateDoctorProfile = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;
    const reactivatedByUserId = req.user.id;

    if (isNaN(parseInt(doctorId))) {
        return next(new AppError('Invalid Doctor ID provided.', 400));
    }

    const success = await DoctorRepository.reactivateDoctorProfile(parseInt(doctorId), reactivatedByUserId);

    if (!success) {
        return res.status(404).json(responseTemplate.notFound('Doctor not found or already active.'));
    }

    res.status(200).json(responseTemplate.success('Doctor profile reactivated successfully.'));
});