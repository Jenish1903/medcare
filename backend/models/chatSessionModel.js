// D:\medicare\backend\models\chatSessionModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const { v4: uuidv4 } = require('uuid');
const { DoctorModel } = require('./doctorModel');
const { PatientModel } = require('./patientModel');
const { UserModel } = require('./userModel');

const ChatSessionModel = sequelize.define('tbl_chat_sessions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sessionId: {
        type: DataTypes.STRING(41),
        allowNull: false,
        unique: true,
        defaultValue: () => `CHAT_${uuidv4()}`
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
    isActive: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
    },
    started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    ended_at: {
        type: DataTypes.DATE,
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
    tableName: 'tbl_chat_sessions',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['doctorId', 'patientId', 'isActive'],
            where: {
                isActive: 1
            }
        }
    ]
});


class ChatSessionRepository {

    static async startChatSession(doctorId, patientId) {
        try {
            const existingSession = await ChatSessionModel.findOne({
                where: { doctorId, patientId, isActive: 1, status_flag: 1 }
            });

            if (existingSession) {
                return { session: existingSession.toJSON(), message: 'Active chat session already exists.' };
            }

            const newSession = await ChatSessionModel.create({
                doctorId,
                patientId,
                isActive: 1,
                status_flag: 1,
                started_at: DataTypes.NOW,
                create_date: DataTypes.NOW,
                update_date: DataTypes.NOW,
                create_user: patientId,
            });
            return { session: newSession.toJSON(), message: 'New chat session started.' };
        } catch (error) {
            console.error('Error starting chat session:', error);
            throw new Error(`Failed to start chat session: ${error.message}`);
        }
    }

    static async endChatSession(sessionId, endedByUserId) {
        try {
            const [affectedRows] = await ChatSessionModel.update(
                {
                    isActive: 0,
                    ended_at: DataTypes.NOW,
                    update_date: DataTypes.NOW,
                    update_user: endedByUserId
                },
                {
                    where: { sessionId: sessionId, isActive: 1, status_flag: 1 }
                }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error ending chat session:', error);
            throw new Error(`Failed to end chat session: ${error.message}`);
        }
    }

    static async getActiveChatSessionBySessionId(sessionId) {
        try {
            const session = await ChatSessionModel.findOne({
                where: { sessionId, isActive: 1, status_flag: 1 },
                include: [
                    { model: DoctorModel, as: 'doctorInfo', attributes: ['userId', 'specialist'], include: [{ model: UserModel, as: 'userInfo', attributes: ['name'] }] },
                    { model: PatientModel, as: 'patientInfo', attributes: ['userId', 'bloodType'], include: [{ model: UserModel, as: 'userInfo', attributes: ['name'] }] }
                ]
            });

            if (!session) return null;

            const sessionData = session.toJSON();
            // Flatten doctor and patient info
            sessionData.doctorName = sessionData.doctorInfo.userInfo.name;
            sessionData.doctorSpecialist = sessionData.doctorInfo.specialist;
            sessionData.patientName = sessionData.patientInfo.userInfo.name;
            sessionData.patientBloodType = sessionData.patientInfo.bloodType;

            delete sessionData.doctorInfo;
            delete sessionData.patientInfo;

            return sessionData;
        } catch (error) {
            console.error('Error fetching active chat session:', error);
            throw new Error(`Failed to fetch chat session: ${error.message}`);
        }
    }

    static async getUserChatSessions(userId, role, isActive = null) {
        try {
            const whereClause = { status_flag: 1 };
            if (isActive !== null) {
                whereClause.isActive = isActive ? 1 : 0;
            }

            if (role === 'doctor') {
                whereClause.doctorId = userId;
            } else if (role === 'patient') {
                whereClause.patientId = userId;
            } else {
                throw new Error('Invalid role specified. Must be "doctor" or "patient".');
            }

            const sessions = await ChatSessionModel.findAll({
                where: whereClause,
                order: [['started_at', 'DESC']],
                include: [
                    { model: DoctorModel, as: 'doctorInfo', attributes: ['userId', 'specialist'], include: [{ model: UserModel, as: 'userInfo', attributes: ['name'] }] },
                    { model: PatientModel, as: 'patientInfo', attributes: ['userId', 'bloodType'], include: [{ model: UserModel, as: 'userInfo', attributes: ['name'] }] }
                ]
            });

            return sessions.map(session => {
                const sessionData = session.toJSON();
                // Flatten doctor and patient info
                sessionData.doctorName = sessionData.doctorInfo.userInfo.name;
                sessionData.doctorSpecialist = sessionData.doctorInfo.specialist;
                sessionData.patientName = sessionData.patientInfo.userInfo.name;
                sessionData.patientBloodType = sessionData.patientInfo.bloodType;

                delete sessionData.doctorInfo;
                delete sessionData.patientInfo;
                return sessionData;
            });
        } catch (error) {
            console.error('Error fetching user chat sessions:', error);
            throw new Error(`Failed to fetch chat sessions: ${error.message}`);
        }
    }

    static async deactivateChatSession(sessionId, deletedByUserId) {
        try {
            const [affectedRows] = await ChatSessionModel.update(
                { status_flag: 0, update_date: DataTypes.NOW, update_user: deletedByUserId },
                { where: { sessionId: sessionId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error deactivating chat session:', error);
            throw new Error(`Failed to deactivate chat session: ${error.message}`);
        }
    }
}

module.exports = {
    ChatSessionModel,
    ChatSessionRepository
};