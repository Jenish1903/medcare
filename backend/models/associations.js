// D:\medicare\backend\models\associations.js
const UserModel = require('./userModel');
const { DoctorModel } = require('./doctorModel');
const { PatientModel } = require('./patientModel');
const { ChatSessionModel } = require('./chatSessionModel');
const { ChatMessageModel } = require('./chatMessageModel');
const { AppointmentModel } = require('./appointmentModel');
const { DoctorReviewModel } = require('./doctorReviewModel');
const { CallModel } = require('./callModel');

function setupAssociations() {
    // tbl_user associations
    UserModel.hasOne(DoctorModel, { foreignKey: 'userId', as: 'doctorProfile' });
    UserModel.hasOne(PatientModel, { foreignKey: 'userId', as: 'patientProfile' });
    // User can be a sender of chat messages
    UserModel.hasMany(ChatMessageModel, { foreignKey: 'senderId', as: 'sentMessages' });
    // User can be a caller in calls
    UserModel.hasMany(CallModel, { foreignKey: 'callerId', as: 'madeCalls' });
    // User can be a create_user or update_user for various tables
    UserModel.hasMany(DoctorModel, { foreignKey: 'create_user', as: 'createdDoctors' });
    UserModel.hasMany(DoctorModel, { foreignKey: 'update_user', as: 'updatedDoctors' });
    // tbl_doctors associations
    DoctorModel.belongsTo(UserModel, { foreignKey: 'userId', targetKey: 'id', as: 'userInfo' });
    DoctorModel.hasMany(AppointmentModel, { foreignKey: 'doctorId', sourceKey: 'userId', as: 'appointments' });
    DoctorModel.hasMany(DoctorReviewModel, { foreignKey: 'doctorId', sourceKey: 'userId', as: 'doctorReviews' });
    DoctorModel.hasMany(ChatSessionModel, { foreignKey: 'doctorId', sourceKey: 'userId', as: 'doctorSessions' });
    // If calleeId in tbl_calls could be doctorId, add:
    DoctorModel.hasMany(CallModel, { foreignKey: 'calleeId', sourceKey: 'userId', as: 'receivedCalls' });
    // tbl_patients associations
    PatientModel.belongsTo(UserModel, { foreignKey: 'userId', targetKey: 'id', as: 'userInfo' });
    PatientModel.hasMany(AppointmentModel, { foreignKey: 'patientId', sourceKey: 'userId', as: 'appointments' });
    PatientModel.hasMany(DoctorReviewModel, { foreignKey: 'patientId', sourceKey: 'userId', as: 'myReviews' });
    PatientModel.hasMany(ChatSessionModel, { foreignKey: 'patientId', sourceKey: 'userId', as: 'patientSessions' });
    // If calleeId in tbl_calls could be patientId, add:
    PatientModel.hasMany(CallModel, { foreignKey: 'calleeId', sourceKey: 'userId', as: 'receivedCalls' });
    // tbl_chat_sessions associations
    ChatSessionModel.belongsTo(DoctorModel, { foreignKey: 'doctorId', targetKey: 'userId', as: 'doctorInfo' });
    ChatSessionModel.belongsTo(PatientModel, { foreignKey: 'patientId', targetKey: 'userId', as: 'patientInfo' });
    ChatSessionModel.hasMany(ChatMessageModel, { foreignKey: 'sessionId', sourceKey: 'sessionId', as: 'messages' });
    // If tbl_calls.sessionId strongly references tbl_chat_sessions.sessionId, add:
    ChatSessionModel.hasMany(CallModel, { foreignKey: 'sessionId', sourceKey: 'sessionId', as: 'calls' });
    // tbl_chat_messages associations
    ChatMessageModel.belongsTo(ChatSessionModel, { foreignKey: 'sessionId', targetKey: 'sessionId', as: 'chatSession' });
    ChatMessageModel.belongsTo(UserModel, { foreignKey: 'senderId', targetKey: 'id', as: 'senderInfo' });
    // tbl_appointments associations
    AppointmentModel.belongsTo(DoctorModel, { foreignKey: 'doctorId', targetKey: 'userId', as: 'doctorInfo' });
    AppointmentModel.belongsTo(PatientModel, { foreignKey: 'patientId', targetKey: 'userId', as: 'patientInfo' });
    // tbl_doctor_reviews associations
    DoctorReviewModel.belongsTo(DoctorModel, { foreignKey: 'doctorId', targetKey: 'userId', as: 'doctorInfo' });
    DoctorReviewModel.belongsTo(PatientModel, { foreignKey: 'patientId', targetKey: 'userId', as: 'patientInfo' });
    // tbl_calls associations
    CallModel.belongsTo(UserModel, { foreignKey: 'callerId', targetKey: 'id', as: 'callerInfo' });
    // If calleeId is guaranteed to be a userId:
    CallModel.belongsTo(UserModel, { foreignKey: 'calleeId', targetKey: 'id', as: 'calleeUserInfo' });

    console.log("All Sequelize associations have been set up.");
}

module.exports = setupAssociations;