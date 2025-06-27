// models/doctorModel.js
const pool = require('../config/db'); // Require the direct db connection
const { v4: uuidv4 } = require('uuid'); // For generating chat session IDs

class Doctor {
    // Fetches all doctors based on online/offline status
    static async getAllDoctors(status, limit = 10, offset = 0) {
        try {
            // Use pool.query() for promise-based query
            const [rows] = await pool.query(
                `SELECT
                    doctorId,
                    image,
                    name,
                    specialist,
                    experience,
                    availableDays,
                    status
                FROM
                    tbl_doctors
                WHERE
                    status_flag = 1
                    ${status ? ' AND status = ?' : ''}
                LIMIT ? OFFSET ?`,
                status ? [status === 'online' ? 1 : 0, limit, offset] : [limit, offset]
            );
            return rows;
        } catch (error) {
            console.error('Database Query Error:', error); // Log detailed error
            throw new Error(`Error fetching doctors: ${error.message}`);
        }
    }

    // Fetches detailed information for a specific doctor by doctorId
    static async getDoctorById(doctorId) {
        try {
            const [rows] = await pool.query(
                `SELECT
                    doctorId,
                    name,
                    specialist AS specialty, -- Alias specialist to specialty
                    experience,
                    reviews,
                    education,
                    license,
                    clinicName,
                    clinicLocation,
                    clinicPhoneNo,
                    workingHours,
                    availableDays
                FROM
                    tbl_doctors
                WHERE
                    doctorId = ? AND status_flag = 1`,
                [doctorId]
            );

            if (rows.length === 0) {
                return null; // Doctor not found
            }

            const doctor = rows[0];

            // Parse JSON string fields back into arrays
            if (doctor.workingHours) {
                try {
                    doctor.workingHours = JSON.parse(doctor.workingHours);
                } catch (e) {
                    console.error('Error parsing workingHours JSON:', e);
                    doctor.workingHours = []; // Default to empty array on parse error
                }
            } else {
                doctor.workingHours = [];
            }

            if (doctor.availableDays) {
                try {
                    doctor.availableDays = JSON.parse(doctor.availableDays);
                } catch (e) {
                    console.error('Error parsing availableDays JSON:', e);
                    doctor.availableDays = []; // Default to empty array on parse error
                }
            } else {
                doctor.availableDays = [];
            }
            
            // Ensure experience and reviews are strings as per API spec
            doctor.experience = doctor.experience ? doctor.experience.toString() : "0";
            doctor.reviews = doctor.reviews ? doctor.reviews.toString() : "0";

            return doctor;
        } catch (error) {
            console.error('Database Query Error (getDoctorById):', error);
            throw new Error(`Error fetching doctor details: ${error.message}`);
        }
    }

    // Starts a chat session (previously in models/chatModel.js)
    // Now takes createUserId for audit purposes, which comes from authenticated user
    static async createChatSession(doctorId, patientId, createUserId) { // createUserId is now mandatory
        try {
            const sessionId = `CHAT-${uuidv4()}`; // Generate a unique session ID
            const timestamp = new Date().toISOString(); // Current timestamp

            const [result] = await pool.query(
                `INSERT INTO tbl_chat_sessions
                (sessionId, doctorId, patientId, isActive, create_user, status_flag, create_date, update_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [sessionId, doctorId, patientId, 1, createUserId, 1, timestamp.slice(0, 19).replace('T', ' '), timestamp.slice(0, 19).replace('T', ' ')] // isActive = 1 (true), status_flag=1, create/update date
            );

            if (result.affectedRows === 0) {
                throw new Error('Failed to create chat session.');
            }

            return { sessionId, message: 'Chat session started', timestamp };
        } catch (error) {
            console.error('Database Query Error (createChatSession):', error);
            throw new Error(`Error creating chat session: ${error.message}`);
        }
    }

    // Sends a message within an active chat session
    static async sendMessage(sessionId, senderId, message, createUserId) {
        try {
            const messageId = `MSG-${uuidv4()}`;
            const now = new Date(); // Get current date object

            // Format for MySQL DATETIME/TIMESTAMP
            // This will produce 'YYYY-MM-DD HH:MM:SS'
            const mysqlTimestamp = now.toISOString().slice(0, 19).replace('T', ' ');

            // If you want milliseconds (and your column is DATETIME(3) or higher precision TIMESTAMP)
            // const mysqlTimestamp = now.toISOString().replace('T', ' ').replace('Z', '').slice(0, -1); // 'YYYY-MM-DD HH:MM:SS.f'

            console.log('Attempting to insert message:', { messageId, sessionId, senderId, message, timestamp: mysqlTimestamp, createUserId });

            const [result] = await pool.query(
                `INSERT INTO tbl_chat_messages
                (messageId, sessionId, senderId, message, timestamp, create_user, status_flag, create_date, update_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [messageId, sessionId, senderId, message, mysqlTimestamp, createUserId, 1, mysqlTimestamp, mysqlTimestamp] // Use mysqlTimestamp here
            );

            if (result.affectedRows === 0) {
                throw new Error('Failed to send message: No rows affected.');
            }

            return { messageId, timestamp: now.toISOString() }; // Return ISO string to client
        } catch (error) {
            console.error('Database Query Error (sendMessage):', error);
            throw new Error(`Error sending message: ${error.message}`);
        }
    }

    // Retrieves the message history for a specific chat session.
    static async getChatHistory(sessionId, before, limit = 20) {
        try {
            let query = `
                SELECT
                    messageId,
                    senderId,
                    message,
                    timestamp
                FROM
                    tbl_chat_messages
                WHERE
                    sessionId = ? AND status_flag = 1
            `;
            const params = [sessionId];

            if (before) {
                query += ` AND timestamp < ?`;
                params.push(before);
            }

            query += `
                ORDER BY
                    timestamp DESC
                LIMIT ?`;
            params.push(limit);

            const [rows] = await pool.query(query, params);

            // Messages are ordered DESC, so reverse them for chronological order
            // Also, format timestamp to ISO 8601 string as per API specification
            const formattedHistory = rows.reverse().map(message => ({
                messageId: message.messageId,
                senderId: message.senderId,
                message: message.message,
                timestamp: new Date(message.timestamp).toISOString()
            }));

            return formattedHistory;
        } catch (error) {
            console.error('Database Query Error (getChatHistory):', error);
            throw new Error(`Error fetching chat history: ${error.message}`);
        }
    }

    // Confirms an appointment for a doctor
    static async confirmAppointment(appointmentId, doctorId, status, updateUserId) {
        try {
            // Map status string to a numeric value for DB (e.g., 'confirmed' -> 1, 'pending' -> 0)
            // Assuming 'confirmed' maps to 1, and other values might be 0 or other indicators
            const statusValue = status === 'confirmed' ? 1 : 0; 
            const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current timestamp for update_date

            const [result] = await pool.query(
                `UPDATE tbl_appointments
                SET
                    status = ?,
                    update_date = ?,
                    update_user = ?
                WHERE
                    appointmentId = ? AND doctorId = ? AND status_flag = 1`,
                [statusValue, now, updateUserId, appointmentId, doctorId]
            );

            if (result.affectedRows === 0) {
                // If no rows were affected, it means the appointment was not found or already confirmed/invalid
                throw new Error('Appointment not found or not eligible for confirmation.');
            }

            // Fetch the appointment details, specifically the reason
            const [appointmentRows] = await pool.query(
                `SELECT reason FROM tbl_appointments WHERE appointmentId = ? AND status_flag = 1`,
                [appointmentId]
            );

            let appointmentReason = null;
            if (appointmentRows.length > 0) {
                appointmentReason = appointmentRows[0].reason;
            }

            // After successful confirmation, fetch the doctor's details as requested in the response
            const doctorDetails = await this.getDoctorById(doctorId);

            if (!doctorDetails) {
                throw new Error('Doctor details not found after appointment confirmation.');
            }

            return {
                workingHours: doctorDetails.workingHours,
                schedule: doctorDetails.availableDays, // Mapping availableDays to schedule
                clinicLocation: doctorDetails.clinicLocation,
                reason: appointmentReason // ADDED REASON HERE
            };

        } catch (error) {
            console.error('Database Query Error (confirmAppointment):', error);
            throw new Error(`Error confirming appointment: ${error.message}`);
        }
    }

    // Retrieves details for an appointment success status display
    static async getAppointmentSuccessDetails(appointmentId) {
        try {
            // 1. Fetch appointment details, especially doctorId and appointmentDateTime
            const [appointmentRows] = await pool.query(
                `SELECT
                    doctorId,
                    appointmentDateTime,
                    status
                FROM
                    tbl_appointments
                WHERE
                    appointmentId = ? AND status_flag = 1`,
                [appointmentId]
            );

            if (appointmentRows.length === 0) {
                return null; // Appointment not found
            }

            const appointment = appointmentRows[0];

            // Check if the appointment is confirmed (assuming 1 means confirmed)
            if (appointment.status !== 1) {
                return null; // Not confirmed, so not 'successful' for this endpoint's purpose
            }

            // 2. Fetch doctor's name using doctorId
            const [doctorRows] = await pool.query(
                `SELECT name FROM tbl_doctors WHERE doctorId = ? AND status_flag = 1`,
                [appointment.doctorId]
            );

            if (doctorRows.length === 0) {
                // This should ideally not happen if doctorId is valid in tbl_appointments
                throw new Error('Doctor associated with appointment not found.');
            }

            const doctorName = doctorRows[0].name;

            return {
                doctor: doctorName,
                time: new Date(appointment.appointmentDateTime).toISOString() // Format to ISO 8601
            };

        } catch (error) {
            console.error('Database Query Error (getAppointmentSuccessDetails):', error);
            throw new Error(`Error fetching appointment success details: ${error.message}`);
        }
    }

    // Retrieves a list of upcoming appointments for a specific patient
    static async getUpcomingAppointmentsForPatient(patientId) {
        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current time in MySQL format

            const [rows] = await pool.query(
                `SELECT
                    a.appointmentId,
                    d.name AS doctorName,
                    d.specialist,
                    d.workingHours,
                    d.availableDays AS schedule, -- Alias to 'schedule'
                    d.clinicLocation
                FROM
                    tbl_appointments a
                JOIN
                    tbl_doctors d ON a.doctorId = d.doctorId
                WHERE
                    a.patientId = ?
                    AND a.appointmentDateTime > ? -- Only upcoming appointments
                    AND a.status = 1 -- Only confirmed appointments (assuming upcoming means confirmed)
                    AND a.status_flag = 1
                    AND d.status_flag = 1
                ORDER BY
                    a.appointmentDateTime ASC`, // Order by soonest first
                [patientId, now]
            );

            // Format the results as per the API specification
            const formattedAppointments = rows.map(appointment => {
                // Parse JSON string fields back into arrays for workingHours and schedule
                let workingHoursParsed = [];
                try {
                    workingHoursParsed = appointment.workingHours ? JSON.parse(appointment.workingHours) : [];
                } catch (e) {
                    console.error('Error parsing workingHours JSON:', e);
                }

                let scheduleParsed = [];
                try {
                    scheduleParsed = appointment.schedule ? JSON.parse(appointment.schedule) : [];
                } catch (e) {
                    console.error('Error parsing availableDays JSON for schedule:', e);
                }

                return {
                    appointmentId: appointment.appointmentId,
                    doctorName: appointment.doctorName,
                    specialist: appointment.specialist,
                    "Working Hours": workingHoursParsed.join(', '), // Join array to string as in example
                    "Schedule": scheduleParsed.join(', '), // Join array to string as in example
                    "Clinic Location": appointment.clinicLocation
                };
            });

            return formattedAppointments;

        } catch (error) {
            console.error('Database Query Error (getUpcomingAppointmentsForPatient):', error);
            throw new Error(`Error fetching upcoming appointments: ${error.message}`);
        }
    }

    // Retrieves a list of past/completed appointments for a specific patient
    static async getCompletedAppointmentsForPatient(patientId) {
        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current time in MySQL format

            const [rows] = await pool.query(
                `SELECT
                    a.appointmentId,
                    d.name AS doctorName,
                    d.specialist,
                    d.workingHours,
                    d.availableDays AS schedule, -- Alias to 'schedule'
                    d.clinicLocation
                FROM
                    tbl_appointments a
                JOIN
                    tbl_doctors d ON a.doctorId = d.doctorId
                WHERE
                    a.patientId = ?
                    AND a.appointmentDateTime <= ? -- Only completed appointments
                    AND a.status = 1 -- Only confirmed appointments (assuming completed implies confirmed)
                    AND a.status_flag = 1
                    AND d.status_flag = 1
                ORDER BY
                    a.appointmentDateTime DESC`, // Order by most recent first
                [patientId, now]
            );

            // Format the results as per the API specification
            const formattedAppointments = rows.map(appointment => {
                // Parse JSON string fields back into arrays for workingHours and schedule
                let workingHoursParsed = [];
                try {
                    workingHoursParsed = appointment.workingHours ? JSON.parse(appointment.workingHours) : [];
                } catch (e) {
                    console.error('Error parsing workingHours JSON:', e);
                }

                let scheduleParsed = [];
                try {
                    scheduleParsed = appointment.schedule ? JSON.parse(appointment.schedule) : [];
                } catch (e) {
                    console.error('Error parsing availableDays JSON for schedule:', e);
                }

                return {
                    appointmentId: appointment.appointmentId,
                    doctorName: appointment.doctorName,
                    specialist: appointment.specialist,
                    "Working Hours": workingHoursParsed.join(', '), // Join array to string as in example
                    "Schedule": scheduleParsed.join(', '), // Join array to string as in example
                    "Clinic Location": appointment.clinicLocation
                };
            });

            return formattedAppointments;
        } catch (error) {
            console.error('Database Query Error (getCompletedAppointmentsForPatient):', error);
            throw new Error(`Error fetching completed appointments: ${error.message}`);
        }
    }

    // --- START NEW API METHOD ---
    // Allows rescheduling of an existing appointment.
    static async rescheduleAppointment(appointmentId, newDateTime, updateUserId) {
        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current timestamp for update_date

            // Check if newDateTime is in the future
            const newDate = new Date(newDateTime);
            if (newDate < new Date()) {
                throw new Error('New appointment date and time must be in the future.');
            }

            const [result] = await pool.query(
                `UPDATE tbl_appointments
                SET
                    appointmentDateTime = ?,
                    update_date = ?,
                    update_user = ?
                WHERE
                    appointmentId = ? AND status_flag = 1`,
                [newDate.toISOString().slice(0, 19).replace('T', ' '), now, updateUserId, appointmentId] // Store as MySQL DATETIME format
            );

            if (result.affectedRows === 0) {
                throw new Error('Appointment not found or could not be rescheduled.');
            }

            return { message: 'Appointment rescheduled successfully' };

        } catch (error) {
            console.error('Database Query Error (rescheduleAppointment):', error);
            throw new Error(`Error rescheduling appointment: ${error.message}`);
        }
    }

    static async submitDoctorReview(doctorId, patientId, rating, comment, createUserId) {
        try {
            const reviewId = `REV-${uuidv4()}`; // Generate a unique review ID
            const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current timestamp

            // Basic validation (more robust validation should be in the controller)
            if (rating < 1 || rating > 5) {
                throw new Error('Rating must be between 1 and 5.');
            }

            const [result] = await pool.query(
                `INSERT INTO tbl_doctor_reviews (reviewId, doctorId, patientId, rating, comment, create_user, status_flag, create_date, update_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [reviewId, doctorId, patientId, rating, comment, createUserId, 1, now, now]
            );

            if (result.affectedRows === 0) {
                throw new Error('Failed to submit review.');
            }

            return { message: 'Review submitted successfully', reviewId };

        } catch (error) {
            console.error('Database Query Error (submitDoctorReview):', error);
            throw new Error(`Error submitting review: ${error.message}`);
        }
    }

    static async checkUpcomingAppointmentsEmpty(patientId) {
        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current time in MySQL format

            const [rows] = await pool.query(
                `SELECT
                    COUNT(*) AS appointmentCount
                FROM
                    tbl_appointments
                WHERE
                    patientId = ?
                    AND appointmentDateTime > ?
                    AND status = 1
                    AND status_flag = 1`,
                [patientId, now]
            );

            const isEmpty = rows[0].appointmentCount === 0;

            return { isEmpty };

        } catch (error) {
            console.error('Database Query Error (checkUpcomingAppointmentsEmpty):', error);
            throw new Error(`Error checking upcoming appointments: ${error.message}`);
        }
    }
    // --- END NEW API METHOD ---

    // --- START NEW API METHOD ---
    // Checks if there are any completed appointments for a specific patient
    static async checkCompletedAppointmentsEmpty(patientId) {
        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current time in MySQL format

            const [rows] = await pool.query(
                `SELECT
                    COUNT(*) AS appointmentCount
                FROM
                    tbl_appointments
                WHERE
                    patientId = ?
                    AND appointmentDateTime <= ?
                    AND status = 1
                    AND status_flag = 1`,
                [patientId, now]
            );

            const isEmpty = rows[0].appointmentCount === 0;

            return { isEmpty };

        } catch (error) {
            console.error('Database Query Error (checkCompletedAppointmentsEmpty):', error);
            throw new Error(`Error checking completed appointments: ${error.message}`);
        }
    }
    
}

module.exports = Doctor;