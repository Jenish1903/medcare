// D:\medicare\backend\models\patientModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const { UserModel } = require('./userModel');

const PatientModel = sequelize.define('tbl_patients', {
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
    bloodType: {
        type: DataTypes.STRING(5),
        allowNull: true,
    },
    medicalHistory: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    emergencyContactName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    emergencyContactPhone: {
        type: DataTypes.STRING(15),
        allowNull: true,
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
    tableName: 'tbl_patients',
    timestamps: false,
});


class PatientRepository {

    static async createPatientProfile(patientData) {
        try {
            const user = await UserModel.findByPk(patientData.userId);
            if (!user || user.role !== 'patient') {
                throw new Error('User not found or not a patient role. Patient profile cannot be created.');
            }

            const newPatient = await PatientModel.create({
                ...patientData,
                create_date: DataTypes.NOW,
                update_date: DataTypes.NOW
            });
            return newPatient.toJSON();
        } catch (error) {
            console.error('Error creating patient profile:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Patient profile already exists for this user.');
            }
            throw new Error(`Failed to create patient profile: ${error.message}`);
        }
    }

    
    static async getPatientById(patientId) {
        try {
            const patient = await PatientModel.findOne({
                where: { userId: patientId, status_flag: 1 },
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

            if (!patient) {
                return null;
            }

            const patientData = patient.toJSON();
            patientData.patientId = patientData.userId;
            patientData.name = patientData.userInfo.name;
            patientData.email = patientData.userInfo.email;
            patientData.phone = patientData.userInfo.phone;
            patientData.gender = patientData.userInfo.gender;
            patientData.dob = patientData.userInfo.dob;

            delete patientData.userId;
            delete patientData.userInfo;

            return patientData;
        } catch (error) {
            console.error('Database Query Error (getPatientById):', error);
            throw new Error(`Error fetching patient details: ${error.message}`);
        }
    }

    static async updatePatientProfile(patientId, updates, updatedByUserId) {
        try {
            updates.update_date = DataTypes.NOW;
            updates.update_user = updatedByUserId;

            const [affectedRows] = await PatientModel.update(updates, {
                where: { userId: patientId, status_flag: 1 }
            });

            return affectedRows > 0;
        } catch (error) {
            console.error('Error updating patient profile:', error);
            throw new Error(`Failed to update patient profile: ${error.message}`);
        }
    }

    static async deactivatePatientProfile(patientId, deletedByUserId) {
        try {
            const [affectedRows] = await PatientModel.update(
                { status_flag: 0, update_date: DataTypes.NOW, update_user: deletedByUserId },
                { where: { userId: patientId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error deactivating patient profile:', error);
            throw new Error(`Failed to deactivate patient profile: ${error.message}`);
        }
    }
}

module.exports = {
    PatientModel,
    PatientRepository
};