// D:\medicare\backend\models\chatMessageModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const { v4: uuidv4 } = require('uuid');
const { ChatSessionModel } = require('./chatSessionModel');
const { UserModel } = require('./userModel');
const ChatMessageModel = sequelize.define('tbl_chat_messages', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    messageId: {
        type: DataTypes.STRING(41),
        allowNull: false,
        unique: true,
        defaultValue: () => `MSG-${uuidv4()}`
    },
    sessionId: {
        type: DataTypes.STRING(41),
        allowNull: false,
        references: {
            model: 'tbl_chat_sessions',
            key: 'sessionId',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tbl_user',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    timestamp: {
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
    tableName: 'tbl_chat_messages',
    timestamps: false,
});

class ChatMessageRepository {

    static async addMessage(sessionId, senderId, messageContent) {
        try {
            
            const session = await ChatSessionModel.findOne({
                where: { sessionId, isActive: 1, status_flag: 1 }
            });

            if (!session) {
                throw new Error('Chat session not found or not active.');
            }
            const now = new Date();    
            const newMessage = await ChatMessageModel.create({
                sessionId,
                senderId,
                message: messageContent,
                timestamp: now,
                create_date: now,
                update_date:now,
                create_user: senderId,
                update_user: senderId
            });
            return newMessage.toJSON();
        } catch (error) {
            console.error('Error adding message:', error);
            throw new Error(`Failed to add message to chat: ${error.message}`);
        }
    }

    static async getMessagesBySession(sessionId, limit = null, offset = 0) {
        try {
            const messages = await ChatMessageModel.findAll({
                where: { sessionId, status_flag: 1 },
                order: [['timestamp', 'ASC']],
                include: [
                    {
                        model: UserModel,
                        as: 'senderInfo',
                        attributes: ['id', 'name', 'role'],
                        required: true
                    }
                ],
                limit: limit,
                offset: offset
            });

            return messages.map(message => {
                const msg = message.toJSON();
                msg.senderName = msg.senderInfo.name;
                msg.senderRole = msg.senderInfo.role;
                delete msg.senderInfo;
                return msg;
            });
        } catch (error) {
            console.error('Error fetching messages by session:', error);
            throw new Error(`Failed to retrieve chat messages: ${error.message}`);
        }
    }

    static async deactivateMessage(messageId, deletedByUserId) {
        try {
            const [affectedRows] = await ChatMessageModel.update(
                { status_flag: 0, update_date: DataTypes.NOW, update_user: deletedByUserId },
                { where: { messageId: messageId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error deactivating message:', error);
            throw new Error(`Failed to deactivate message: ${error.message}`);
        }
    }

    static async updateMessage(messageId, newMessageContent, updatedByUserId) {
        try {
            const [affectedRows] = await ChatMessageModel.update(
                { message: newMessageContent, update_date: DataTypes.NOW, update_user: updatedByUserId },
                { where: { messageId: messageId, status_flag: 1 } }
            );
            return affectedRows > 0;
        } catch (error) {
            console.error('Error updating message:', error);
            throw new Error(`Failed to update message: ${error.message}`);
        }
    }
}

module.exports = {
    ChatMessageModel,
    ChatMessageRepository
};