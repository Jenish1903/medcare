// D:\medicare\backend\models\callModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const { v4: uuidv4 } = require('uuid');
const { UserModel } = require('./userModel');
const { ChatSessionModel } = require('./chatSessionModel');


const CallModel = sequelize.define('tbl_calls', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    callId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        defaultValue: () => `CALL_${uuidv4()}`
    },
    sessionId: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    callerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tbl_user',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    calleeId: {
        type: DataTypes.STRING(255), // Keep as STRING to match your parsedCalleeId.toString()
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('video', 'audio'),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('calling', 'ringing', 'active', 'ended', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'calling',
    },
    rtcToken: {
        type: DataTypes.TEXT, // Changed to TEXT as tokens can be long
        allowNull: true, // Allow null if not all calls require an RTC token, or false if mandatory
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
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
    tableName: 'tbl_calls',
    timestamps: false,
});


class CallRepository {

    static async createCall(callData) {
        try {
            const { sessionId, callerId, calleeId, type, rtcToken } = callData;

            const caller = await UserModel.findByPk(callerId);
            if (!caller) {
                throw new Error('Caller not found.');
            }

            const newCall = await CallModel.create({
                sessionId,
                callerId,
                calleeId,
                type,
                rtcToken,
                status: 'calling',
                status_flag: 1,
                created_at: new Date(),
                updated_at: new Date(),
                create_date: new Date(),
                update_date: new Date(),
                create_user: callerId,
                update_user: callerId
            });
            return newCall.toJSON();
        } catch (error) {
            console.error('Error creating call:', error);
            throw new Error(`Failed to create call record: ${error.message}`);
        }
    }

    static async updateCallStatus(callId, newStatus, updatedByUserId) {
        try {
            const validStatuses = ['calling', 'ringing', 'active', 'ended', 'failed', 'cancelled'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error(`Invalid call status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}`);
            }

            const [affectedRows] = await CallModel.update(
                {
                    status: newStatus,
                    updated_at: new Date(),
                    update_date: new Date(),
                    update_user: updatedByUserId
                },
                { where: { callId: callId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error updating call status:', error);
            throw new Error(`Failed to update call status: ${error.message}`);
        }
    }

    static async getCallById(callId) {
        try {
            const call = await CallModel.findOne({
                where: { callId, status_flag: 1 },
                include: [
                    {
                        model: UserModel,
                        as: 'callerInfo',
                        attributes: ['id', 'name', 'email', 'role']
                    }
                ]
            });

            if (!call) return null;

            const callData = call.toJSON();
            callData.callerName = callData.callerInfo?.name;
            callData.callerEmail = callData.callerInfo?.email;
            callData.callerRole = callData.callerInfo?.role;
            delete callData.callerInfo;

            return callData;
        } catch (error) {
            console.error('Error fetching call by ID:', error);
            throw new Error(`Failed to retrieve call: ${error.message}`);
        }
    }

    static async getUserCalls(userId, type = null, status = null) {
        try {
            const whereClause = {
                status_flag: 1,
                [DataTypes.Op.or]: [
                    { callerId: userId },
                    { calleeId: userId.toString() } // Ensure consistent type for calleeId lookup
                ]
            };
            if (type) {
                whereClause.type = type;
            }
            if (status) {
                whereClause.status = status;
            }

            const calls = await CallModel.findAll({
                where: whereClause,
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: UserModel,
                        as: 'callerInfo',
                        attributes: ['id', 'name', 'email', 'role'],
                        required: true
                    }
                ]
            });

            return calls.map(call => {
                const callData = call.toJSON();
                callData.callerName = callData.callerInfo?.name;
                callData.callerEmail = callData.callerInfo?.email;
                callData.callerRole = callData.callerInfo?.role;
                delete callData.callerInfo;
                return callData;
            });
        } catch (error) {
            console.error('Error fetching user calls:', error);
            throw new Error(`Failed to retrieve user calls: ${error.message}`);
        }
    }

    static async deactivateCall(callId, deletedByUserId) {
        try {
            const [affectedRows] = await CallModel.update(
                { status_flag: 0, update_date: DataTypes.NOW, update_user: deletedByUserId },
                { where: { callId: callId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error deactivating call:', error);
            throw new Error(`Failed to deactivate call: ${error.message}`);
        }
    }
}

module.exports = {
    CallModel,
    CallRepository
};