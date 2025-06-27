// controllers/doctorController.js
const Doctor = require('../models/doctorModel'); // Doctor model now handles chat methods too
const AppError = require('../utils/appError');

// Controller to get a list of doctors
exports.getDoctors = async (req, res, next) => {
    try {
        const { status, limit = 10, offset = 0 } = req.query; // Default limit and offset
        const doctors = await Doctor.getAllDoctors(status, parseInt(limit), parseInt(offset));

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
            experience: doctor.experience.toString(), // Convert experience to string
            availableDays: doctor.availableDays,
            status: doctor.status === 1 ? 'online' : 'offline' // Convert DB status to string
        }));

        res.status(200).json({
            status: 'success',
            results: formattedDoctors.length,
            data: formattedDoctors
        });
    } catch (error) {
        // Pass the error to the global error handling middleware
        next(new AppError('Failed to retrieve doctors.', 500));
    }
};

// Controller to get detailed information about a specific doctor
exports.getDoctorDetail = async (req, res, next) => {
    try {
        const { doctorId } = req.params; // Get doctorId from URL parameters
        const doctor = await Doctor.getDoctorById(doctorId);

        if (!doctor) {
            return next(new AppError('Doctor not found with that ID.', 404));
        }

        res.status(200).json({
            status: 'success',
            data: doctor
        });
    } catch (error) {
        // Pass the error to the global error handling middleware
        next(new AppError('Failed to retrieve doctor details.', 500));
    }
};

// Controller to start a chat session (previously in controllers/chatController.js)
exports.startChatSession = async (req, res, next) => {
    try {
        const { doctorId, patientId } = req.body;

        // Basic validation
        if (!doctorId || !patientId) {
            return next(new AppError('Doctor ID and Patient ID are required.', 400));
        }

        // Placeholder user ID (in a real app, this would come from authentication)
        // This '1' assumes a generic system user or admin creating the session initially.
        const createUserId = 1; 

        const sessionData = await Doctor.createChatSession(doctorId, patientId, createUserId);

        res.status(201).json({ // 201 Created status for successful resource creation
            status: 'success',
            sessionId: sessionData.sessionId,
            message: sessionData.message,
            timestamp: sessionData.timestamp
        });
    } catch (error) {
        // Pass the error to the global error handling middleware
        next(new AppError('Failed to start chat session.', 500));
    }
};

// Controller to send a chat message
exports.sendChatMessage = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { senderId, message } = req.body;

        // Basic validation
        if (!senderId || !message) {
            return next(new AppError('Sender ID and message are required.', 400));
        }

        // --- CHANGE MADE HERE ---
        // 'create_user' in the database is an INT.
        // 'senderId' (e.g., 'PAT12345') is a string and cannot be directly inserted into an INT column.
        // For now, using a placeholder integer (e.g., 1) as the 'create_user'.
        // In a real application, this `createUserId` should come from the *authenticated* user's integer ID.
        const createUserId = 1; 
        // --- END OF CHANGE ---

        const messageData = await Doctor.sendMessage(sessionId, senderId, message, createUserId);

        res.status(200).json({
            status: 'success',
            messageId: messageData.messageId,
            timestamp: messageData.timestamp
        });
    } catch (error) {
        next(new AppError('Failed to send chat message.', 500));
    }
};

// Controller to get chat message history for a session
exports.getChatHistory = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { before, limit = 20 } = req.query; // 'before' for pagination, 'limit' for number of messages

        const history = await Doctor.getChatHistory(sessionId, before, parseInt(limit));

        if (!history || history.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No chat history found for this session.',
                data: []
            });
        }

        res.status(200).json({
            status: 'success',
            results: history.length,
            data: history
        });
    } catch (error) {
        next(new AppError('Failed to retrieve chat history.', 500));
    }
};

// Controller for doctor to confirm an appointment
exports.confirmDoctorAppointment = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { doctorId, status } = req.body;

        // Basic validation
        if (!doctorId || !status) {
            return next(new AppError('Doctor ID and status are required in the request body.', 400));
        }

        // Assuming a placeholder user ID for the doctor confirming the appointment
        const updateUserId = 1; // This should come from the authenticated doctor's ID

        const confirmationDetails = await Doctor.confirmAppointment(appointmentId, doctorId, status, updateUserId);

        res.status(200).json({
            status: 'success',
            ...confirmationDetails // This will include workingHours, schedule, clinicLocation, reason
        });

    } catch (error) {
        next(new AppError(`Failed to confirm appointment: ${error.message}`, 500));
    }
};

// Controller to get final success status of an appointment
exports.getAppointmentSuccessStatus = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;

        const details = await Doctor.getAppointmentSuccessDetails(appointmentId);

        if (!details) {
            // If appointment not found or not confirmed
            return next(new AppError('Appointment not found or not yet confirmed.', 404));
        }

        res.status(200).json({
            status: 'success',
            details: details
        });

    } catch (error) {
        next(new AppError(`Failed to retrieve appointment success status: ${error.message}`, 500));
    }
};

// --- START NEW API CONTROLLER ---
// Controller to retrieve upcoming appointments for the authenticated patient
exports.getUpcomingAppointmentsForPatient = async (req, res, next) => {
    try {
        // IMPORTANT: In a real app, 'patientId' should come from the authenticated user's session (req.user.id)
        // And you'd verify that req.user.role === 'patient'.
        const patientId = 'PAT12345'; // Placeholder patient ID for now

        const appointments = await Doctor.getUpcomingAppointmentsForPatient(patientId);

        if (!appointments || appointments.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No upcoming appointments found for this patient.',
                data: []
            });
        }

        res.status(200).json({
            status: 'success',
            results: appointments.length,
            data: appointments
        });

    } catch (error) {
        next(new AppError(`Failed to retrieve upcoming appointments: ${error.message}`, 500));
    }
};

exports.getCompletedAppointmentsForPatient = async (req, res, next) => {
    try {
        // IMPORTANT: In a real app, 'patientId' should come from the authenticated user's session (req.user.id)
        // And you'd verify that req.user.role === 'patient'.
        const patientId = 'PAT12345'; // Placeholder patient ID for now

        const appointments = await Doctor.getCompletedAppointmentsForPatient(patientId);

        if (!appointments || appointments.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No completed appointments found for this patient.',
                data: []
            });
        }

        res.status(200).json({
            status: 'success',
            results: appointments.length,
            data: appointments
        });

    } catch (error) {
         next(new AppError(`Failed to retrieve completed appointments: ${error.message}`, 500));
    }
};


exports.rescheduleAppointment = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { newDateTime } = req.body;

        // Basic validation
        if (!newDateTime) {
            return next(new AppError('New date and time for rescheduling is required.', 400));
        }

        // Placeholder user ID (in a real app, this would come from authentication)
        const updateUserId = 1;

        const result = await Doctor.rescheduleAppointment(appointmentId, newDateTime, updateUserId);

        res.status(200).json({
            status: 'success',
            message: result.message
        });

    } catch (error) {
        // Handle specific errors for user feedback
        if (error.message.includes('New appointment date and time must be in the future')) {
            return next(new AppError(error.message, 400));
        }
        if (error.message.includes('Appointment not found or could not be rescheduled')) {
            return next(new AppError(error.message, 404));
        }
        next(new AppError(`Failed to reschedule appointment: ${error.message}`, 500));
    }
};

exports.submitDoctorReview = async (req, res, next) => {
    try {
        const { doctorId } = req.params;
        const { patientId, rating, comment } = req.body;

        // Basic validation (more robust validation should be in middleware)
        if (!patientId || !rating || !comment) {
            return next(new AppError('Patient ID, rating, and comment are required.', 400));
        }

        const numericRating = Number(rating); // Ensure rating is a number
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
             return next(new AppError('Rating must be a number between 1 and 5.', 400));
        }

        // Placeholder user ID (in a real app, this would come from authentication)
        const createUserId = 1;

        const result = await Doctor.submitDoctorReview(doctorId, patientId, numericRating, comment, createUserId);

        res.status(201).json({ // 201 Created for successful resource creation
            status: 'success',
            ...result
        });

    } catch (error) {
        // Handle specific errors for user feedback
        if (error.message.includes('Rating must be between 1 and 5')) {
            return next(new AppError(error.message, 400));
        }
        next(new AppError(`Failed to submit review: ${error.message}`, 500));
    }
};

exports.checkUpcomingAppointmentsEmpty = async (req, res, next) => {
    try {
        // IMPORTANT: In a real app, 'patientId' should come from the authenticated user's session (req.user.id)
        // And you'd verify that req.user.role === 'patient'.
        const patientId = 'PAT12345'; // Placeholder patient ID for now

        const result = await Doctor.checkUpcomingAppointmentsEmpty(patientId);

        res.status(200).json({
            isEmpty: result.isEmpty,
            message: result.isEmpty ? 'No upcoming appointments' : 'Upcoming appointments found' // Added message based on isEmpty
        });

    } catch (error) {
        next(new AppError(`Failed to check upcoming appointments: ${error.message}`, 500));
    }
};
// --- END NEW API CONTROLLER ---

// --- START NEW API CONTROLLER ---
// Controller to check if there are any completed appointments for the authenticated patient (for empty state UI)
exports.checkCompletedAppointmentsEmpty = async (req, res, next) => {
    try {
        // IMPORTANT: In a real app, 'patientId' should come from the authenticated user's session (req.user.id)
        // And you'd verify that req.user.role === 'patient'.
        const patientId = 'PAT12345'; // Placeholder patient ID for now

        const result = await Doctor.checkCompletedAppointmentsEmpty(patientId);

        res.status(200).json({
            isEmpty: result.isEmpty,
            message: result.isEmpty ? 'No completed appointments' : 'Completed appointments found' // Added message based on isEmpty
        });

    } catch (error) {
        next(new AppError(`Failed to check completed appointments: ${error.message}`, 500));
    }
};