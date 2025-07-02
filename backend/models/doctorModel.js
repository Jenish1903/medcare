// D:\medicare\backend\models\doctorModel.js
const pool = require('../config/db');
const moment = require('moment');

class Doctor {
    static async getAllDoctors(status, limit = 10, offset = 0) {
        let connection;
        try {
            connection = await pool.getConnection();
            let query = `
                SELECT
                    td.userId AS doctorId,
                    td.image,
                    tu.name,
                    td.specialist,
                    td.experience,
                    td.availableDates,
                    td.status,
                    td.reviews
                FROM
                    tbl_doctors td
                JOIN
                    tbl_user tu ON td.userId = tu.id
                WHERE
                    td.status_flag = 1
            `;
            const params = [];

            if (status !== undefined && status !== null) {
                query += ` AND td.status = ?`;
                params.push(status);
            }

            query += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const [rows] = await connection.query(query, params);

            return rows.map(doctor => {
                if (doctor.availableDates) {
                    try {
                        doctor.availableDates = JSON.parse(doctor.availableDates);
                        doctor.availableDates = doctor.availableDates.filter(dateStr => moment(dateStr).isSameOrAfter(moment(), 'day'));
                    } catch (e) {
                        console.error('Error parsing availableDates JSON for doctor list:', e);
                        doctor.availableDates = [];
                    }
                } else {
                    doctor.availableDates = [];
                }
                return doctor;
            });
        } catch (error) {
            console.error('Database Query Error (getAllDoctors):', error);
            throw new Error(`Error fetching doctors: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async getDoctorById(doctorId) {
        let connection;
        try {
            connection = await pool.getConnection();
            const [rows] = await connection.query(
                `SELECT
                    td.userId AS doctorId,
                    tu.name,
                    td.specialist AS specialty,
                    td.experience,
                    td.reviews,
                    td.education,
                    td.license,
                    td.clinicName,
                    td.clinicLocation,
                    td.clinicPhoneNo,
                    td.workingHours,
                    td.availableDates
                FROM
                    tbl_doctors td
                JOIN
                    tbl_user tu ON td.userId = tu.id
                WHERE
                    td.userId = ? AND td.status_flag = 1`,
                [doctorId]
            );

            if (rows.length === 0) {
                return null;
            }

            const doctor = rows[0];

            if (doctor.workingHours) {
                try {
                    doctor.workingHours = JSON.parse(doctor.workingHours);
                } catch (e) {
                    console.error('Error parsing workingHours JSON:', e);
                    doctor.workingHours = [];
                }
            } else {
                doctor.workingHours = [];
            }

            if (doctor.availableDates) {
                try {
                    doctor.availableDates = JSON.parse(doctor.availableDates);
                    doctor.availableDates = doctor.availableDates.filter(dateStr => moment(dateStr).isSameOrAfter(moment(), 'day'));
                } catch (e) {
                    console.error('Error parsing availableDates JSON:', e);
                    doctor.availableDates = [];
                }
            } else {
                doctor.availableDates = [];
            }

            doctor.experience = doctor.experience ? doctor.experience.toString() : "0";
            doctor.reviews = doctor.reviews ? doctor.reviews.toString() : "0";

            return doctor;
        } catch (error) {
            console.error('Database Query Error (getDoctorById):', error);
            throw new Error(`Error fetching doctor details: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async getAvailableSlotsForDate(doctorId, dateString) {
        let connection;
        try {
            connection = await pool.getConnection();

            const [doctorRows] = await connection.query(
                `SELECT workingHours, availableDates FROM tbl_doctors WHERE userId = ? AND status_flag = 1`,
                [doctorId]
            );

            if (doctorRows.length === 0) {
                throw new Error('Doctor not found or not active.');
            }

            const doctor = doctorRows[0];
            let standardWorkingHours = [];
            let availableDates = [];

            if (doctor.workingHours) {
                try {
                    standardWorkingHours = JSON.parse(doctor.workingHours);
                } catch (e) {
                    console.error('Error parsing doctor workingHours:', e);
                }
            }
            if (doctor.availableDates) {
                try {
                    availableDates = JSON.parse(doctor.availableDates);
                } catch (e) {
                    console.error('Error parsing doctor availableDates:', e);
                }
            }

            const requestedDateMoment = moment(dateString, 'YYYY-MM-DD', true);
            if (!requestedDateMoment.isValid() || !availableDates.includes(dateString) || requestedDateMoment.isBefore(moment(), 'day')) {
                return [];
            }

            const [bookedSlotsRows] = await connection.query(
                `SELECT appointmentTime FROM tbl_appointments WHERE doctorId = ? AND appointmentDate = ? AND status = 'scheduled'`,
                [doctorId, dateString]
            );

            const bookedSlots = bookedSlotsRows.map(row => row.appointmentTime);

            const availableSlots = standardWorkingHours.filter(slot => !bookedSlots.includes(slot));

            return availableSlots;

        } catch (error) {
            console.error('Database Query Error (getAvailableSlotsForDate):', error);
            throw new Error(`Error fetching available slots: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async updateDoctorAvailableDates(doctorId, daysAhead = 60) {
        let connection;
        try {
            connection = await pool.getConnection();

            const futureDates = [];
            for (let i = 0; i < daysAhead; i++) {
                futureDates.push(moment().add(i, 'days').format('YYYY-MM-DD'));
            }

            const updatedAvailableDatesJson = JSON.stringify(futureDates);

            await connection.query(
                `UPDATE tbl_doctors SET availableDates = ? WHERE userId = ?`,
                [updatedAvailableDatesJson, doctorId]
            );
            console.log(`Updated availableDates for doctor ${doctorId} with ${daysAhead} days.`);
        } catch (error) {
            console.error(`Error updating available dates for doctor ${doctorId}:`, error);
            throw new Error(`Failed to update doctor availability: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async updateWorkingHours(doctorId, newWorkingHoursArray) {
        let connection;
        try {
            connection = await pool.getConnection();
            const workingHoursJson = JSON.stringify(newWorkingHoursArray);
            await connection.query(
                `UPDATE tbl_doctors SET workingHours = ? WHERE userId = ?`,
                [workingHoursJson, doctorId]
            );
        } catch (error) {
            console.error(`Error updating working hours for doctor ${doctorId}:`, error);
            throw new Error(`Failed to update doctor's working hours: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async manageSpecificAvailableDate(doctorId, dateString, action) {
        let connection;
        try {
            connection = await pool.getConnection();

            const [rows] = await connection.query(
                `SELECT availableDates FROM tbl_doctors WHERE userId = ?`,
                [doctorId]
            );

            if (rows.length === 0) {
                throw new Error('Doctor not found.');
            }

            let currentDates = [];
            if (rows[0].availableDates) {
                try {
                    currentDates = JSON.parse(rows[0].availableDates);
                } catch (e) {
                    console.error('Error parsing current availableDates:', e);
                }
            }

            if (action === 'add' && !currentDates.includes(dateString)) {
                currentDates.push(dateString);
                currentDates.sort((a, b) => moment(a).valueOf() - moment(b).valueOf());
            } else if (action === 'remove') {
                currentDates = currentDates.filter(date => date !== dateString);
            }

            const updatedDatesJson = JSON.stringify(currentDates);
            await connection.query(
                `UPDATE tbl_doctors SET availableDates = ? WHERE userId = ?`,
                [updatedDatesJson, doctorId]
            );

        } catch (error) {
            console.error(`Error managing specific available date for doctor ${doctorId}:`, error);
            throw new Error(`Failed to manage doctor's specific availability: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async confirmAppointmentByDoctor(appointmentId, doctorUserId, status) {
        let connection;
        try {
            connection = await pool.getConnection();

            const [appointmentRows] = await connection.query(
                `SELECT doctorId, status FROM tbl_appointments WHERE id = ? AND status_flag = 1`,
                [appointmentId]
            );

            if (appointmentRows.length === 0) {
                return null;
            }

            const appointment = appointmentRows[0];

            if (appointment.doctorId !== doctorUserId) {
                throw new Error('Unauthorized: Doctor not assigned to this appointment.');
            }

            const [result] = await connection.query(
                `UPDATE tbl_appointments
                 SET status = ?, update_user = ?, update_date = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [status, doctorUserId, appointmentId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Appointment update failed (no rows affected).');
            }

            const [updatedAppointmentRows] = await connection.query(
                `SELECT ta.id, ta.appointmentDate, ta.appointmentTime, ta.status,
                        tu_d.name AS doctorName, tu_p.name AS patientName
                 FROM tbl_appointments ta
                 JOIN tbl_user tu_d ON ta.doctorId = tu_d.id
                 JOIN tbl_user tu_p ON ta.patientId = tu_p.id
                 WHERE ta.id = ?`,
                [appointmentId]
            );

            return updatedAppointmentRows[0];

        } catch (error) {
            console.error('Database Query Error (confirmAppointmentByDoctor):', error);
            throw new Error(`Error confirming appointment: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async getAppointmentDetails(appointmentId) {
        let connection;
        try {
            connection = await pool.getConnection();
            const [rows] = await connection.query(
                `SELECT
                    ta.id AS appointmentId,
                    ta.appointmentDate,
                    ta.appointmentTime,
                    ta.status,
                    tu_d.name AS doctorName,
                    tu_p.name AS patientName,
                    td.specialist,
                    td.clinicName,
                    td.clinicLocation
                FROM
                    tbl_appointments ta
                JOIN
                    tbl_user tu_d ON ta.doctorId = tu_d.id
                JOIN
                    tbl_user tu_p ON ta.patientId = tu_p.id
                LEFT JOIN
                    tbl_doctors td ON ta.doctorId = td.userId
                WHERE
                    ta.id = ? AND ta.status_flag = 1`,
                [appointmentId]
            );

            if (rows.length === 0) {
                return null;
            }

            return rows[0];

        } catch (error) {
            console.error('Database Query Error (getAppointmentDetails):', error);
            throw new Error(`Error fetching appointment details: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }


    static async getPatientAppointments(patientId, type) {
        let connection;
        try {
            connection = await pool.getConnection();
            const now = moment().format('YYYY-MM-DD');
            const nowTime = moment().format('hh:mm A');

            let query = `
                SELECT
                    ta.id AS appointmentId,
                    tu_d.name AS doctorName,
                    td.specialist,
                    ta.appointmentDate,
                    ta.appointmentTime,
                    td.clinicLocation,
                    ta.status
                FROM
                    tbl_appointments ta
                JOIN
                    tbl_user tu_d ON ta.doctorId = tu_d.id
                LEFT JOIN
                    tbl_doctors td ON ta.doctorId = td.userId
                WHERE
                    ta.status_flag = 1
            `;
            const params = [];

            // Dynamically add patientId filter if it's provided
            if (patientId !== undefined) {
                query += ` AND ta.patientId = ?`;
                params.push(patientId);
            }

            if (type === 'upcoming') {
                query += ` AND ta.status IN ('scheduled', 'confirmed', 'pending') AND (
                    ta.appointmentDate > ?
                    OR (ta.appointmentDate = ? AND STR_TO_DATE(ta.appointmentTime, '%h:%i %p') >= STR_TO_DATE(?, '%h:%i %p'))
                ) ORDER BY ta.appointmentDate ASC, STR_TO_DATE(ta.appointmentTime, '%h:%i %p') ASC`;
                params.push(now, now, nowTime);
            } else if (type === 'completed') {
                query += ` AND (
                    ta.status = 'completed'
                    OR (ta.appointmentDate < ? AND ta.status != 'cancelled')
                    OR (ta.appointmentDate = ? AND STR_TO_DATE(ta.appointmentTime, '%h:%i %p') < STR_TO_DATE(?, '%h:%i %p') AND ta.status != 'cancelled')
                ) ORDER BY ta.appointmentDate DESC, STR_TO_DATE(ta.appointmentTime, '%h:%i %p') DESC`;
                params.push(now, now, nowTime);
            } else {
                throw new Error('Invalid appointment type specified. Must be "upcoming" or "completed".');
            }

            const [rows] = await connection.query(query, params);
            return rows;

        } catch (error) {
            console.error(`Database Query Error (getPatientAppointments - ${type}):`, error);
            throw new Error(`Error fetching ${type} appointments: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }
    static async rescheduleAppointment(appointmentId, patientId, newDate, newTime) {
        let connection;
        try {
            connection = await pool.getConnection();

            await connection.beginTransaction();

            const [appointmentRows] = await connection.query(
                `SELECT doctorId, status FROM tbl_appointments WHERE id = ? AND patientId = ? AND status_flag = 1`,
                [appointmentId, patientId]
            );

            if (appointmentRows.length === 0) {
                throw new Error('Appointment not found or does not belong to this patient.');
            }

            const currentAppointment = appointmentRows[0];
            if (currentAppointment.status === 'completed' || currentAppointment.status === 'cancelled') {
                throw new Error('Cannot reschedule a completed or cancelled appointment.');
            }

            const doctorId = currentAppointment.doctorId;

            const [doctorDetails] = await connection.query(
                `SELECT workingHours, availableDates FROM tbl_doctors WHERE userId = ? AND status_flag = 1`,
                [doctorId]
            );

            if (doctorDetails.length === 0) {
                throw new Error('Doctor not found or not active.');
            }

            const doctorWorkingHours = JSON.parse(doctorDetails[0].workingHours || '[]');
            const doctorAvailableDates = JSON.parse(doctorDetails[0].availableDates || '[]');

            if (!doctorAvailableDates.includes(newDate)) {
                throw new Error(`Doctor is not available on ${newDate}.`);
            }

            if (!doctorWorkingHours.includes(newTime)) {
                throw new Error(`Doctor does not work at ${newTime}.`);
            }

            const [clashRows] = await connection.query(
                `SELECT id FROM tbl_appointments WHERE doctorId = ? AND appointmentDate = ? AND appointmentTime = ? AND status IN ('scheduled', 'confirmed') AND id != ?`,
                [doctorId, newDate, newTime, appointmentId]
            );

            if (clashRows.length > 0) {
                throw new Error('The requested new time slot is already booked.');
            }

            const [result] = await connection.query(
                `UPDATE tbl_appointments
                 SET appointmentDate = ?, appointmentTime = ?, status = 'scheduled', update_user = ?, update_date = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [newDate, newTime, patientId, appointmentId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Failed to update appointment (no rows affected).');
            }

            await connection.commit();
            return true;

        } catch (error) {
            if (connection) await connection.rollback();
            console.error(`Database Transaction Error (rescheduleAppointment for ${appointmentId}):`, error);
            throw new Error(`Error rescheduling appointment: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async addDoctorReview(doctorId, patientId, rating, comment) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const reviewUuid = crypto.randomUUID(); // Generate a UUID for reviewId

            // 1. Insert the new review into tbl_doctor_reviews
            // Assuming tbl_doctor_reviews exists with columns: reviewId (VARCHAR(36) PK), doctorId, patientId, rating, comment, create_date
            const [insertReviewResult] = await connection.query(
                `INSERT INTO tbl_doctor_reviews (reviewId, doctorId, patientId, rating, comment, create_date)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [reviewUuid, doctorId, patientId, rating, comment]
            );

            if (insertReviewResult.affectedRows === 0) {
                throw new Error('Failed to insert review.');
            }

            // 2. Get current review count for the doctor from tbl_doctors
            // Assuming tbl_doctors has a 'reviews' (INT) column
            const [doctorStatsRows] = await connection.query(
                `SELECT reviews FROM tbl_doctors WHERE userId = ? AND status_flag = 1`,
                [doctorId]
            );

            let currentReviewsCount = 0;
            if (doctorStatsRows.length > 0) {
                currentReviewsCount = doctorStatsRows[0].reviews || 0;
            }

            // 3. Calculate new total reviews
            const newReviewsCount = currentReviewsCount + 1;

            // 4. Update the doctor's table with new total reviews
            const [updateDoctorResult] = await connection.query(
                `UPDATE tbl_doctors
                 SET reviews = ?
                 WHERE userId = ? AND status_flag = 1`,
                [newReviewsCount, doctorId]
            );

            if (updateDoctorResult.affectedRows === 0) {
                // If the doctor was not found for update, it might indicate an issue
                throw new Error('Failed to update doctor review statistics (doctor not found or inactive).');
            }

            await connection.commit();
            return reviewUuid;

        } catch (error) {
            if (connection) await connection.rollback();
            console.error(`Database Transaction Error (addDoctorReview for Doctor ID ${doctorId}):`, error);
            throw new Error(`Error submitting doctor review: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }
    
    static async initiateVideoCall(sessionId, callerId, calleeId) {
        let connection;
        try {
            connection = await pool.getConnection();
            const callId = `VID_${crypto.randomUUID()}`; // Unique call ID (e.g., VID_a1b2c3d4-...)
            // Placeholder RTC token. Replace this with actual token generation from your WebRTC provider.
            const rtcToken = `webrtc_video_token_${crypto.randomUUID()}`;
            const currentTime = moment().toISOString(); // ISO 8601 format for consistency

            await connection.beginTransaction(); // Start transaction

            // Insert call details into tbl_calls
            const [insertCallResult] = await connection.query(
                `INSERT INTO tbl_calls (callId, sessionId, callerId, calleeId, type, status, rtcToken, created_at)
                 VALUES (?, ?, ?, ?, 'video', 'calling', ?, CURRENT_TIMESTAMP)`,
                [callId, sessionId, callerId, calleeId, rtcToken]
            );

            if (insertCallResult.affectedRows === 0) {
                throw new Error('Failed to log video call initiation to database.');
            }

            await connection.commit(); // Commit transaction

            return {
                callId: callId,
                status: 'calling',
                rtcToken: rtcToken,
                time: currentTime
            };
        } catch (error) {
            if (connection) await connection.rollback(); // Rollback on error
            console.error('Database Operation Error (initiateVideoCall):', error);
            throw new Error(`Failed to initiate video call: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }


    static async initiateAudioCall(sessionId, callerId, calleeId) {
        let connection;
        try {
            connection = await pool.getConnection();
            const callId = `AUD_${crypto.randomUUID()}`; // Unique call ID (e.g., AUD_a1b2c3d4-...)
            // Placeholder RTC token. Replace this with actual token generation from your WebRTC provider.
            const rtcToken = `webrtc_audio_token_${crypto.randomUUID()}`;
            const currentTime = moment().toISOString(); // ISO 8601 format

            await connection.beginTransaction(); // Start transaction

            // Insert call details into tbl_calls
            const [insertCallResult] = await connection.query(
                `INSERT INTO tbl_calls (callId, sessionId, callerId, calleeId, type, status, rtcToken, created_at)
                    VALUES (?, ?, ?, ?, 'audio', 'calling', ?, CURRENT_TIMESTAMP)`,
                [callId, sessionId, callerId, calleeId, rtcToken]
            );

            if (insertCallResult.affectedRows === 0) {
                throw new Error('Failed to log audio call initiation to database.');
            }

            await connection.commit(); // Commit transaction

            return {
                callId: callId,
                status: 'calling',
                rtcToken: rtcToken,
                time: currentTime
            };
        } catch (error) {
            if (connection) await connection.rollback(); // Rollback on error
            console.error('Database Operation Error (initiateAudioCall):', error);
            throw new Error(`Failed to initiate audio call: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async startChatSession(doctorId, patientId) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Check for existing active session between this doctor and patient
            // Using 'isActive = 1' as per your accepted schema
            const [existingSessions] = await connection.query(
                `SELECT sessionId FROM tbl_chat_sessions
                 WHERE doctorId = ? AND patientId = ? AND isActive = 1`,
                [doctorId, patientId]
            );

            if (existingSessions.length > 0) {
                // If an active session already exists, return its ID instead of creating a new one
                await connection.rollback(); // No need to commit if nothing new is inserted
                return {
                    sessionId: existingSessions[0].sessionId,
                    message: 'Active chat session already exists.',
                    timestamp: moment().toISOString() // Current time for response consistency
                };
            }

            // 2. Generate a new unique sessionId
            const newSessionId = `CHAT_${crypto.randomUUID()}`; // Example: CHAT_a1b2c3d4-e5f6...
            const startedAt = moment().toISOString();

            // 3. Insert the new session into tbl_chat_sessions
            // Setting 'isActive = 1' as per your accepted schema
            const [insertResult] = await connection.query(
                `INSERT INTO tbl_chat_sessions (sessionId, doctorId, patientId, isActive, started_at)
                 VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)`,
                [newSessionId, doctorId, patientId]
            );

            if (insertResult.affectedRows === 0) {
                throw new Error('Failed to create new chat session.');
            }

            await connection.commit();
            return {
                sessionId: newSessionId,
                message: 'Chat session started',
                timestamp: startedAt
            };
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Database Transaction Error (startChatSession):', error);
            throw new Error(`Error starting chat session: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async sendChatMessage(sessionId, senderId, message) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Verify session exists and is active using 'isActive = 1'
            const [sessionRows] = await connection.query(
                `SELECT sessionId FROM tbl_chat_sessions WHERE sessionId = ? AND isActive = 1`,
                [sessionId]
            );

            if (sessionRows.length === 0) {
                throw new Error('Chat session not found or is not active.');
            }

            const messageId = `MSG_${crypto.randomUUID()}`; // Example: MSG_a1b2c3d4...
            const timestamp = moment().toISOString();

            // Insert the message into tbl_chat_messages
            const [insertResult] = await connection.query(
                `INSERT INTO tbl_chat_messages (messageId, sessionId, senderId, message, timestamp)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [messageId, sessionId, senderId, message]
            );

            if (insertResult.affectedRows === 0) {
                throw new Error('Failed to send chat message.');
            }

            await connection.commit();
            return {
                messageId: messageId,
                timestamp: timestamp
            };
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Database Transaction Error (sendChatMessage):', error);
            throw new Error(`Error sending chat message: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async getChatHistory(sessionId, before, limit = 20) {
        let connection;
        try {
            connection = await pool.getConnection();
            let query = `
                SELECT
                    messageId,
                    senderId,
                    message,
                    timestamp
                FROM
                    tbl_chat_messages
                WHERE
                    sessionId = ?
            `;
            const params = [sessionId];

            if (before) {
                // Ensure 'before' is a valid timestamp
                if (!moment(before).isValid()) {
                    throw new Error('Invalid "before" timestamp format.');
                }
                query += ` AND timestamp < ?`;
                params.push(before);
            }

            query += ` ORDER BY timestamp DESC LIMIT ?`; // Get latest messages first
            params.push(limit);

            const [rows] = await connection.query(query, params);

            // Reversing the order to show oldest first, if that's desired for display
            // (fetched latest DESC, so reverse for ascending display if needed)
            return rows.reverse();

        } catch (error) {
            console.error('Database Query Error (getChatHistory):', error);
            throw new Error(`Error retrieving chat history: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async hasUpcomingAppointments(patientId) {
        let connection;
        try {
            connection = await pool.getConnection();
            const now = moment().format('YYYY-MM-DD');
            const nowTime = moment().format('hh:mm A');
    
            // --- TEMPORARY DEBUGGING LOGS (keep for now, if still needed) ---
            console.log('--- Debugging hasUpcomingAppointments Query ---');
            console.log('Node.js Current Date:', now);
            console.log('Node.js Current Time:', nowTime);
            console.log('Patient ID (passed to model):', patientId);
            console.log('-------------------------------------------');
            // --- END TEMPORARY DEBUGGING LOGS ---
    
            let query = `
                SELECT COUNT(*) AS count FROM tbl_appointments
                WHERE status_flag = 1
                AND status IN ('scheduled', 'confirmed', 'pending') AND (
                    appointmentDate > ?
                    OR (appointmentDate = ? AND STR_TO_DATE(appointmentTime, '%h:%i %p') >= STR_TO_DATE(?, '%h:%i %p'))
                )
            `;
            // Initialize params with the date and time values
            const params = [now, now, nowTime];
    
            // Conditionally add patientId to the WHERE clause if it's provided
            if (patientId !== undefined) {
                query += ` AND patientId = ?`;
                params.push(patientId); // Add patientId to the END of the params array
            }
    
            console.log('Final Query:', query); // Debugging: See the final query string
            console.log('Final Params:', params); // Debugging: See the final parameters
    
            const [rows] = await connection.query(query, params);
            return rows[0].count > 0;
        } catch (error) {
            console.error('Database Query Error (hasUpcomingAppointments):', error);
            throw new Error(`Error checking upcoming appointments status: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async hasCompletedAppointments(patientId) {
        let connection;
        try {
            connection = await pool.getConnection();
            const now = moment().format('YYYY-MM-DD');
            const nowTime = moment().format('hh:mm A');
    
            // Initial query part for completed appointments logic
            let query = `
                SELECT COUNT(*) AS count FROM tbl_appointments
                WHERE status_flag = 1
                AND (
                    status = 'completed'
                    OR (appointmentDate < ? AND status != 'cancelled')
                    OR (appointmentDate = ? AND STR_TO_DATE(appointmentTime, '%h:%i %p') < STR_TO_DATE(?, '%h:%i %p') AND status != 'cancelled')
                )
            `;
            // Initialize params with date and time values for the completed logic
            const params = [now, now, nowTime];
    
            // Conditionally add patientId to the WHERE clause if it's provided
            if (patientId !== undefined) {
                query += ` AND patientId = ?`;
                params.push(patientId); // Add patientId to the END of the params array
            }
    
            console.log('Final Completed Query:', query); // Debugging
            console.log('Final Completed Params:', params); // Debugging
    
            const [rows] = await connection.query(query, params);
            return rows[0].count > 0;
        } catch (error) {
            console.error('Database Query Error (hasCompletedAppointments):', error);
            throw new Error(`Error checking completed appointments status: ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = Doctor;