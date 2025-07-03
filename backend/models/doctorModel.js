/* The class `DoctorRepository` contains methods for interacting with the `DoctorModel` in a database,
including creating, updating, fetching, and managing doctor profiles. */
// D:\medicare\backend\models\doctorModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const moment = require('moment');
const { UserModel } = require('./userModel');

const DoctorModel = sequelize.define('tbl_doctors', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'tbl_user',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    image: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    specialist: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    experience: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    reviews: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    education: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    license: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    clinicName: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    clinicLocation: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    clinicPhoneNo: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    appointmentBookingTime: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('appointmentBookingTime');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('appointmentBookingTime', JSON.stringify(value));
        }
    },
    availableDates: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('availableDates');
            if (!rawValue) return [];
            try {
                const dates = JSON.parse(rawValue);
                return dates.filter(dateStr => moment(dateStr, 'YYYY-MM-DD', true).isSameOrAfter(moment(), 'day'));
            } catch (e) {
                console.error('Error parsing availableDates JSON from DB for DoctorModel:', e);
                return [];
            }
        },
        set(value) {
            this.setDataValue('availableDates', JSON.stringify(value));
        }
    },
    status: {
        type: DataTypes.TINYINT,
        allowNull: true,
        defaultValue: 0,
    },
    status_flag: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
    },
    create_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    update_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    create_user: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    update_user: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'tbl_doctors',
    timestamps: false,
});


class DoctorRepository {
    static async createDoctor(doctorData) {
        try {
            const user = await UserModel.findByPk(doctorData.userId);
            if (!user || user.role !== 'doctor') {
                throw new Error('User not found or not registered as a doctor.');
            }

            const newDoctor = await DoctorModel.create({
                ...doctorData,
                create_date: DataTypes.NOW,
                update_date: DataTypes.NOW
            });
            return newDoctor.toJSON();
        } catch (error) {
            console.error('Error creating doctor profile:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Doctor profile already exists for this user.');
            }
            throw new Error(`Failed to create doctor profile: ${error.message}`);
        }
    }

    static async getAllDoctors(status, limit = 10, offset = 0) {
        try {
            const whereClause = {
                status_flag: 1,
            };
            if (status !== undefined && status !== null) {
                whereClause.status = status;
            }

            const doctors = await DoctorModel.findAll({
                where: whereClause,
                attributes: [
                    'userId', 'image', 'specialist', 'experience', 'reviews', 'availableDates', 'status'
                ],
                include: [
                    {
                        model: UserModel,
                        as: 'userInfo',
                        attributes: ['name'],
                        required: true
                    }
                ],
                order: [['userInfo', 'name', 'ASC']],
                limit: limit,
                offset: offset
            });

            return doctors.map(doctor => {
                const doc = doctor.toJSON();
                doc.doctorId = doc.userId;
                doc.name = doc.userInfo.name;
                delete doc.userId;
                delete doc.userInfo;
                return doc;
            });
        } catch (error) {
            console.error('Database Query Error (getAllDoctors):', error);
            throw new Error(`Error fetching doctors: ${error.message}`);
        }
    }

    static async getDoctorById(doctorId) {
        try {
            const doctor = await DoctorModel.findOne({
                where: { userId: doctorId, status_flag: 1 },
                include: [
                    {
                        model: UserModel,
                        as: 'userInfo',
                        attributes: ['name', 'email', 'phone', 'gender', 'dob'],
                        required: true
                    }
                ],
                attributes: { exclude: ['id', 'create_date', 'update_date', 'create_user', 'update_user'] } 
            });

            if (!doctor) {
                return null;
            }

            const doc = doctor.toJSON();
            doc.doctorId = doc.userId;
            doc.name = doc.userInfo.name;
            doc.email = doc.userInfo.email;
            doc.phone = doc.userInfo.phone;
            doc.gender = doc.userInfo.gender;
            doc.dob = doc.userInfo.dob;
            doc.specialty = doc.specialist;
            doc.onlineStatus = doc.status;
            doc.experience = doc.experience ? doc.experience.toString() : "0";
            doc.reviews = doc.reviews ? doc.reviews.toString() : "0";

            delete doc.userId;
            delete doc.userInfo;
            delete doc.specialist;
            delete doc.status;

            return doc;
        } catch (error) {
            console.error('Database Query Error (getDoctorById):', error);
            throw new Error(`Error fetching doctor details: ${error.message}`);
        }
    }

    static async updateDoctorProfile(doctorId, updates, updatedByUserId) {
        try {
            if (updates.appointmentBookingTime) {
                updates.appointmentBookingTime = JSON.stringify(updates.appointmentBookingTime);
            }
            if (updates.availableDates) {
                updates.availableDates = JSON.stringify(updates.availableDates);
            }

            updates.update_date = new Date();
            updates.update_user = updatedByUserId;

            const [affectedRows] = await DoctorModel.update(updates, {
                where: { userId: doctorId, status_flag: 1 }
            });

            return affectedRows > 0;
        } catch (error) {
            console.error('Error updating doctor profile:', error);
            throw new Error(`Failed to update doctor profile: ${error.message}`);
        }
    }

    static async getAvailableSlotsForDate(doctorId, dateString) {
        try {
            const doctor = await DoctorModel.findOne({
                where: { userId: doctorId, status_flag: 1 },
                attributes: ['appointmentBookingTime', 'availableDates'] // Changed from workingHours
            });

            if (!doctor) {
                throw new Error('Doctor not found or not active.');
            }

            const standardAppointmentBookingTime = doctor.appointmentBookingTime; // Changed from workingHours
            const availableDates = doctor.availableDates;
            const requestedDateMoment = moment(dateString, 'YYYY-MM-DD', true);
            if (!requestedDateMoment.isValid()) {
                throw new Error('Invalid date format provided. Must be YYYY-MM-DD.');
            }
            if (!availableDates.includes(dateString)) {
                return [];
            }
            if (requestedDateMoment.isBefore(moment(), 'day')) {
                return [];
            }

            const { AppointmentModel } = require('./appointmentModel');

            const bookedSlots = await AppointmentModel.findAll({
                where: {
                    doctorId: doctorId,
                    appointmentDate: dateString,
                    status: ['scheduled', 'confirmed', 'pending'],
                    status_flag: 1
                },
                attributes: ['appointmentTime']
            });

            const bookedTimes = bookedSlots.map(slot => slot.appointmentTime);

            const availableSlots = standardAppointmentBookingTime.filter(slot => { // Changed from workingHours
                const slotMoment = moment(slot, 'hh:mm A');
                if (requestedDateMoment.isSame(moment(), 'day')) {
                    return !bookedTimes.includes(slot) && slotMoment.isAfter(moment());
                }
                return !bookedTimes.includes(slot);
            });

            return availableSlots;

        } catch (error) {
            console.error('Database Query Error (getAvailableSlotsForDate):', error);
            throw new Error(`Error fetching available slots: ${error.message}`);
        }
    }

    static async updateDoctorAvailableDates(doctorId, daysAhead = 60) {
        try {
            const futureDates = [];
            for (let i = 0; i < daysAhead; i++) {
                futureDates.push(moment().add(i, 'days').format('YYYY-MM-DD'));
            }

            const [affectedRows] = await DoctorModel.update(
                { availableDates: futureDates, update_date: new Date() },
                { where: { userId: doctorId, status_flag: 1 } }
            );

            if (affectedRows === 0) {
                console.warn(`No rows updated for doctor ${doctorId}. Doctor might not exist or be inactive.`);
                return false;
            } else {
                console.log(`Updated availableDates for doctor ${doctorId} with ${daysAhead} days.`);
                return true;
            }
        } catch (error) {
            console.error(`Error updating available dates for doctor ${doctorId}:`, error);
            throw new Error(`Failed to update doctor availability: ${error.message}`);
        }
    }

    static async updateAppointmentBookingTime(doctorId, newAppointmentBookingTimeArray) {
        try {
                    const [affectedRows] = await DoctorModel.update(
            { appointmentBookingTime: newAppointmentBookingTimeArray, update_date: new Date() }, // update_user is missing here
            { where: { userId: doctorId, status_flag: 1 } }
            );

            if (affectedRows === 0) {
                console.warn(`No rows updated for doctor ${doctorId}. Doctor might not exist or be inactive.`);
                return false;
            }
            return true;
        } catch (error) {
            console.error(`Error updating appointment booking time for doctor ${doctorId}:`, error); // Changed message
            throw new Error(`Failed to update doctor's appointment booking time: ${error.message}`); // Changed message
        }
    }


    static async updateDoctorStatus(doctorId, newStatus, updatedByUserId) {
        try 
        {
            if (newStatus !== 0 && newStatus !== 1) 
            {
                throw new Error("Invalid status. Must be 0 (offline) or 1 (online).");
            }
            const [affectedRows] = await DoctorModel.update(
                { status: newStatus, update_date: new Date(), update_user: updatedByUserId },
                { where: { userId: doctorId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error(`Error updating doctor status for ${doctorId}:`, error);
            throw new Error(`Failed to update doctor status: ${error.message}`);
        }
    }

    static async manageSpecificAvailableDate(doctorId, dateString, action) {
        try {
            const doctor = await DoctorModel.findOne({
                where: { userId: doctorId, status_flag: 1 }
            });

            if (!doctor) {
                throw new Error('Doctor not found or not active.');
            }

            let currentDates = doctor.availableDates;

            const dateMoment = moment(dateString, 'YYYY-MM-DD', true);
            if (!dateMoment.isValid()) {
                throw new Error('Invalid date format provided. Must be YYYY-MM-DD.');
            }

            if (action === 'add') {
                if (dateMoment.isBefore(moment(), 'day')) {
                    throw new Error('Cannot add a date in the past.');
                }
                if (!currentDates.includes(dateString)) {
                    currentDates.push(dateString);
                    currentDates.sort((a, b) => moment(a).valueOf() - moment(b).valueOf());
                }
            } else if (action === 'remove') {
                currentDates = currentDates.filter(date => date !== dateString);
            } else {
                throw new Error('Invalid action. Must be "add" or "remove".');
            }

            doctor.availableDates = currentDates;
            doctor.update_date = new Date();
            await doctor.save();

            return true;

        } catch (error) {
            console.error(`Error managing specific available date for doctor ${doctorId}:`, error);
            throw new Error(`Failed to manage doctor's specific availability: ${error.message}`);
        }
    }

    static async deactivateDoctorProfile(doctorId, deletedByUserId) {
        let transaction;
        try {
            transaction = await sequelize.transaction();

            const [affectedRowsDoctor] = await DoctorModel.update(
                { status_flag: 0, update_date: new Date(), update_user: deletedByUserId },
                { where: { userId: doctorId, status_flag: 1 }, transaction }
            );

            if (affectedRowsDoctor === 0) {
                await transaction.rollback();
                return false;
            }

            const [affectedRowsUser] = await UserModel.update(
                { status_flag: 0, update_date: new Date(), update_user: deletedByUserId },
                { where: { id: doctorId, status_flag: 1 }, transaction }
            );

            if (affectedRowsUser === 0) {
                console.warn(`User with ID ${doctorId} not found or already inactive in tbl_user during doctor deactivation. This might be expected if the user was already inactive.`);
            }
            
            await transaction.commit();
            return true;

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('Error deactivating doctor profile and associated user:', error);
            throw new Error(`Failed to deactivate doctor profile and user: ${error.original?.sqlMessage || error.message}`);
        }
    }


    static async createDoctor(doctorData) {
        try {
            const user = await UserModel.findByPk(doctorData.userId);
            if (!user || user.role !== 'doctor') {
                throw new Error('User not found or not registered as a doctor.');
            }

            const newDoctor = await DoctorModel.create({
                ...doctorData,
                create_date: new Date(),
                update_date: new Date(),
            });
            return newDoctor.toJSON();
        } catch (error) {
            console.error('Error creating doctor profile:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Doctor profile already exists for this user.');
            }
            throw new Error(`Failed to create doctor profile: ${error.message}`);
        }
    }

    static async reactivateDoctorProfile(doctorId, reactivatedByUserId) {
        let transaction;
        try {
            transaction = await sequelize.transaction();

            const [affectedRowsDoctor] = await DoctorModel.update(
                { status_flag: 1, update_date: new Date(), update_user: reactivatedByUserId },
                { where: { userId: doctorId, status_flag: 0 }, transaction }
            );

            if (affectedRowsDoctor === 0) {
                await transaction.rollback();
                throw new Error('Doctor profile not found or already active.');
            }

            const [affectedRowsUser] = await UserModel.update(
                { status_flag: 1, update_date: new Date(), update_user: reactivatedByUserId },
                { where: { id: doctorId, status_flag: 0 }, transaction }
            );

            if (affectedRowsUser === 0) {
                console.warn(`Warning: User with ID ${doctorId} not found or already active in tbl_user during doctor reactivation.`);
            }
            
            await transaction.commit();
            return true;

        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }
            console.error('Error reactivating doctor profile and associated user:', error);
            throw new Error(`Failed to reactivate doctor profile and user: ${error.original?.sqlMessage || error.message}`);
        }
    }
}

module.exports = {
    DoctorModel,
    DoctorRepository
};
