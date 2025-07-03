const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const moment = require('moment');
const { DoctorModel } = require('./doctorModel');
const { PatientModel } = require('./patientModel');
const { UserModel } = require('./userModel');

const AppointmentModel = sequelize.define('tbl_appointments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    doctorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tbl_doctors',
            key: 'userId',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    patientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tbl_patients',
            key: 'userId',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    appointmentDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    appointmentTime: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
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
    tableName: 'tbl_appointments',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['doctorId', 'appointmentDate', 'appointmentTime']
        }
    ]
});

class AppointmentRepository {

    static async bookAppointment(appointmentData) {
        try {
            const { doctorId, patientId, appointmentDate, appointmentTime, create_user } = appointmentData;
            const doctor = await DoctorModel.findOne({ where: { userId: doctorId, status_flag: 1 } });
            const patient = await PatientModel.findOne({ where: { userId: patientId, status_flag: 1 } });

            if (!doctor) {
                throw new Error('Doctor not found or inactive.');
            }
            if (!patient) {
                throw new Error('Patient not found or inactive.');
            }

            const availableDates = doctor.availableDates;
            const requestedDateMoment = moment(appointmentDate, 'YYYY-MM-DD', true);

            if (!requestedDateMoment.isValid() || !availableDates.includes(appointmentDate) || requestedDateMoment.isBefore(moment(), 'day')) {
                throw new Error('Appointment date is invalid or not available for the doctor.');
            }

            const workingHours = doctor.workingHours;
            if (!workingHours.includes(appointmentTime)) {
                throw new Error('Appointment time is outside the doctor\'s working hours.');
            }

            const existingAppointment = await AppointmentModel.findOne({
                where: {
                    doctorId,
                    appointmentDate,
                    appointmentTime,
                    status_flag: 1,
                    status: ['pending', 'confirmed', 'scheduled']
                }
            });

            if (existingAppointment) {
                throw new Error('This appointment slot is already booked.');
            }

            if (requestedDateMoment.isSame(moment(), 'day')) {
                const requestedTimeMoment = moment(appointmentTime, 'hh:mm A');
                if (requestedTimeMoment.isBefore(moment())) {
                    throw new Error('Cannot book an appointment for a past time on the current day.');
                }
            }

            const newAppointment = await AppointmentModel.create({
                doctorId,
                patientId,
                appointmentDate,
                appointmentTime,
                status: 'pending',
                status_flag: 1,
                create_date: new Date(),
                update_date: new Date(),
                create_user: create_user || patientId,
                update_user: create_user || patientId
            });

            return newAppointment.toJSON();
        } catch (error) {
            console.error('Error booking appointment:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('This exact appointment slot is already taken.');
            }
            throw new Error(`Failed to book appointment: ${error.message}`);
        }
    }

    static async updateAppointmentStatus(appointmentId, newStatus, updatedByUserId) {
        try {
            const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'scheduled'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error(`Invalid appointment status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}`);
            }

            const [affectedRows] = await AppointmentModel.update(
                {
                    status: newStatus,
                    update_date: new Date(),
                    update_user: updatedByUserId
                },
                { where: { id: appointmentId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error updating appointment status:', error);
            throw new Error(`Failed to update appointment status: ${error.message}`);
        }
    }

    static async getAppointmentById(appointmentId) {
        try {
            const appointment = await AppointmentModel.findOne({
                where: { id: appointmentId, status_flag: 1 },
                include: [
                    {
                        model: DoctorModel,
                        as: 'doctorInfo',
                        attributes: ['userId', 'specialist'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name', 'email'] }]
                    },
                    {
                        model: PatientModel,
                        as: 'patientInfo',
                        attributes: ['userId', 'bloodType'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name', 'email'] }]
                    }
                ]
            });

            if (!appointment) return null;

            const apptData = appointment.toJSON();
            apptData.doctorName = apptData.doctorInfo?.userInfo?.name;
            apptData.doctorEmail = apptData.doctorInfo?.userInfo?.email;
            apptData.doctorSpecialist = apptData.doctorInfo?.specialist;
            apptData.patientName = apptData.patientInfo?.userInfo?.name;
            apptData.patientEmail = apptData.patientInfo?.userInfo?.email;
            apptData.patientBloodType = apptData.patientInfo?.bloodType;

            delete apptData.doctorInfo;
            delete apptData.patientInfo;
            return apptData;
        } catch (error) {
            console.error('Error fetching appointment by ID:', error);
            throw new Error(`Failed to retrieve appointment: ${error.message}`);
        }
    }

    static async getUserAppointments(userId, role, status = null, includePast = false) {
        try {
            const whereClause = { status_flag: 1 };
            if (status) {
                whereClause.status = status;
            }

            if (role === 'doctor') {
                if (userId) {
                    whereClause.doctorId = userId;
                }
            } else if (role === 'patient') {
                if (userId) {
                    whereClause.patientId = userId;
                }
            } else {
                throw new Error('Invalid role specified. Must be "doctor" or "patient".');
            }

            if (!includePast) {
                whereClause.appointmentDate = {
                    [Op.gte]: moment().format('YYYY-MM-DD')
                };
            }

            const appointments = await AppointmentModel.findAll({
                where: whereClause,
                order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']],
                include: [
                    {
                        model: DoctorModel,
                        as: 'doctorInfo',
                        attributes: ['userId', 'specialist', 'clinicLocation'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name'] }],
                        required: true
                    },
                    {
                        model: PatientModel,
                        as: 'patientInfo',
                        attributes: ['userId', 'bloodType'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name'] }],
                        required: true
                    }
                ]
            });

            return appointments.map(appointment => {
                const apptData = appointment.toJSON();
                apptData.doctorName = apptData.doctorInfo?.userInfo?.name;
                apptData.doctorSpecialist = apptData.doctorInfo?.specialist;
                apptData.clinicLocation = apptData.doctorInfo?.clinicLocation;
                apptData.patientName = apptData.patientInfo?.userInfo?.name;
                apptData.patientBloodType = apptData.patientInfo?.bloodType;

                delete apptData.doctorInfo;
                delete apptData.patientInfo;
                return apptData;
            });
        } catch (error) {
            console.error('Error fetching user appointments:', error);
            throw new Error(`Failed to retrieve appointments: ${error.message}`);
        }
    }

    static async confirmAppointmentByDoctor(appointmentId, doctorUserId, newStatus) {
        try {
            const validDoctorStatuses = ['confirmed', 'cancelled', 'completed'];
            if (!validDoctorStatuses.includes(newStatus)) {
                throw new Error(`Invalid status for doctor confirmation: ${newStatus}. Must be "confirmed", "cancelled", or "completed".`);
            }
            const appointment = await AppointmentModel.findOne({
                where: {
                    id: appointmentId,
                    doctorId: doctorUserId,
                    status_flag: 1
                },
                include: [
                    {
                        model: DoctorModel,
                        as: 'doctorInfo',
                        attributes: ['userId', 'specialist'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name', 'email'] }]
                    },
                    {
                        model: PatientModel,
                        as: 'patientInfo',
                        attributes: ['userId', 'bloodType'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name', 'email'] }]
                    }
                ]
            });

            if (!appointment) {
                return null;
            }

            const [affectedRows] = await AppointmentModel.update(
                {
                    status: newStatus,
                    update_user: doctorUserId,
                    update_date: new Date()
                },
                {
                    where: {
                        id: appointmentId,
                        status_flag: 1
                    }
                }
            );

            if (affectedRows === 0) {
                throw new Error('Appointment update failed (no rows affected).');
            }

            const updatedAppointment = await AppointmentModel.findOne({
                where: { id: appointmentId },
                include: [
                    {
                        model: DoctorModel,
                        as: 'doctorInfo',
                        attributes: ['userId', 'specialist'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name', 'email'] }]
                    },
                    {
                        model: PatientModel,
                        as: 'patientInfo',
                        attributes: ['userId', 'bloodType'],
                        include: [{ model: UserModel, as: 'userInfo', attributes: ['name', 'email'] }]
                    }
                ]
            });


            if (!updatedAppointment) {
                return null;
            }

            const apptData = updatedAppointment.toJSON();
            apptData.doctorName = apptData.doctorInfo?.userInfo?.name;
            apptData.doctorEmail = apptData.doctorInfo?.userInfo?.email;
            apptData.doctorSpecialist = apptData.doctorInfo?.specialist;
            apptData.patientName = apptData.patientInfo?.userInfo?.name;
            apptData.patientEmail = apptData.patientInfo?.userInfo?.email;
            apptData.patientBloodType = apptData.patientInfo?.bloodType;

            delete apptData.doctorInfo;
            delete apptData.patientInfo;
            return apptData;

        } catch (error) {
            console.error('Error confirming appointment (ORM):', error);
            throw new Error(`Failed to confirm appointment: ${error.message}`);
        }
    }

    static async rescheduleAppointment(appointmentId, patientId, newDate, newTime) {
        const updatedByUserId = patientId;

        try {
            const result = await sequelize.transaction(async (t) => {
                const existingAppointment = await AppointmentModel.findOne({
                    where: {
                        id: appointmentId,
                        patientId: patientId,
                        status_flag: 1
                    },
                    transaction: t
                });

                if (!existingAppointment) {
                    throw new Error('Appointment not found or does not belong to this patient.');
                }

                
                if (existingAppointment.status === 'completed' || existingAppointment.status === 'cancelled') {
                    throw new Error('Cannot reschedule a completed or cancelled appointment.');
                }

                const doctorId = existingAppointment.doctorId;

                const doctor = await DoctorModel.findOne({
                    where: { userId: doctorId, status_flag: 1 },
                    attributes: ['workingHours', 'availableDates'],
                    transaction: t
                });

                if (!doctor) {
                    throw new Error('Doctor not found or not active.');
                }

                const doctorWorkingHours = doctor.workingHours || []; 
                const doctorAvailableDates = doctor.availableDates || [];

                if (!doctorAvailableDates.includes(newDate)) {
                    throw new Error(`Doctor is not available on ${newDate}.`);
                }

                if (!doctorWorkingHours.includes(newTime)) {
                    throw new Error(`Doctor does not work at ${newTime}.`);
                }

                const clashAppointment = await AppointmentModel.findOne({
                    where: {
                        doctorId: doctorId,
                        appointmentDate: newDate,
                        appointmentTime: newTime,
                        status: {
                            [Op.in]: ['scheduled', 'confirmed']
                        },
                        id: {
                            [Op.ne]: appointmentId
                        }
                    },
                    transaction: t
                });

                if (clashAppointment) {
                    throw new Error('The requested new time slot is already booked.');
                }

                const newDateTimeMoment = moment(`${newDate} ${newTime}`, 'YYYY-MM-DD hh:mm A');
                if (newDateTimeMoment.isBefore(moment())) {
                    throw new Error('Cannot reschedule an appointment to a past date or time.');
                }

                const [affectedRows] = await AppointmentModel.update(
                    {
                        appointmentDate: newDate,
                        appointmentTime: newTime,
                        status: 'scheduled',
                        update_user: updatedByUserId,
                        update_date: new Date()
                    },
                    {
                        where: {
                            id: appointmentId,
                            status_flag: 1 
                        },
                        transaction: t
                    }
                );

                if (affectedRows === 0) {
                    throw new Error('Failed to update appointment (no rows affected).');
                }

                return true;
            });

            return result;
        } catch (error) {
            console.error(`Error rescheduling appointment for ID ${appointmentId}:`, error);
            throw error;
        }
    }

    static async deactivateAppointment(appointmentId, deletedByUserId) {
        try {
            const [affectedRows] = await AppointmentModel.update(
                { status_flag: 0, update_date: new Date(), update_user: deletedByUserId },
                { where: { id: appointmentId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error deactivating appointment:', error);
            throw new Error(`Failed to deactivate appointment: ${error.message}`);
        }
    }

    static async hasUpcomingAppointments(patientId) {
        try {
            const now = moment();
            const today = now.format('YYYY-MM-DD');
            const currentTime = now.format('hh:mm A');

            const whereClause = {
                status_flag: 1,
                status: {
                    [Op.in]: ['scheduled', 'confirmed', 'pending']
                },
                [Op.or]: [
                    { appointmentDate: { [Op.gt]: today } },
                    {
                        appointmentDate: today,
                        appointmentTime: {
                            [Op.gte]: currentTime
                        }
                    }
                ]
            };

            if (patientId !== undefined) {
                whereClause.patientId = patientId;
            }

            const count = await AppointmentModel.count({
                where: whereClause
            });

            return count > 0;
        } catch (error) {
            console.error('Error checking upcoming appointments status (Sequelize):', error);
            throw new Error(`Error checking upcoming appointments status: ${error.message}`);
        }
    }

    static async hasCompletedAppointments(patientId) {
        try {
            const now = moment();
            const today = now.format('YYYY-MM-DD');
            const currentTime = now.format('hh:mm A');

            const whereClause = {
                status_flag: 1,
                [Op.or]: [
                    { status: 'completed' },
                    {
                        appointmentDate: { [Op.lt]: today },
                        status: { [Op.ne]: 'cancelled' }
                    },
                    {
                        appointmentDate: today,
                        appointmentTime: { [Op.lt]: currentTime },
                        status: { [Op.ne]: 'cancelled' }
                    }
                ]
            };

            if (patientId !== undefined) {
                whereClause.patientId = patientId;
            }

            const count = await AppointmentModel.count({
                where: whereClause
            });

            return count > 0;
        } catch (error) {
            console.error('Error checking completed appointments status (Sequelize):', error);
            throw new Error(`Error checking completed appointments status: ${error.message}`);
        }
    }

}

module.exports = {
    AppointmentModel,
    AppointmentRepository
};