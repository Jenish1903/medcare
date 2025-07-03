const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const { v4: uuidv4 } = require('uuid');
const { DoctorModel } = require('./doctorModel');
const { PatientModel } = require('./patientModel');
const { UserModel } = require('./userModel');

const DoctorReviewModel = sequelize.define('tbl_doctor_reviews', {
    reviewId: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        allowNull: false,
        defaultValue: () => uuidv4()
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
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5,
        },
    },
    comment: {
        type: DataTypes.TEXT,
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
    tableName: 'tbl_doctor_reviews',
    timestamps: false,
});


class DoctorReviewRepository {

    static async createReview(reviewData, createdByUserId) {
        let transaction;
        try {
            const { doctorId, patientId, rating, comment } = reviewData;

            if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
                throw new Error('Rating is required and must be a number between 1 and 5.');
            }

            transaction = await sequelize.transaction();

            const doctor = await DoctorModel.findOne({
                where: { userId: doctorId, status_flag: 1 },
                transaction
            });
            const patient = await PatientModel.findOne({
                where: { userId: patientId, status_flag: 1 },
                transaction
            });

            if (!doctor) {
                throw new Error('Doctor not found or inactive.');
            }
            if (!patient) {
                throw new Error('Patient not found or inactive.');
            }

            const newReview = await DoctorReviewModel.create({
                doctorId,
                patientId,
                rating,
                comment,
                status_flag: 1,
                create_user: createdByUserId,
                update_user: createdByUserId
            }, { transaction });

            await DoctorReviewRepository.updateDoctorReviewsSummary(doctorId, createdByUserId, transaction);

            await transaction.commit();

            return newReview.toJSON();

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('Error creating review:', error);
            throw new Error(`Failed to create doctor review: ${error.message}`);
        }
    }


    static async getReviewsByDoctorId(doctorId, limit = null, offset = 0) {
        try {
            const reviews = await DoctorReviewModel.findAll({
                where: { doctorId, status_flag: 1 },
                order: [['create_date', 'DESC']], // Order by most recent reviews
                include: [
                    {
                        model: PatientModel,
                        as: 'patientInfo', // Make sure this alias matches your association setup
                        attributes: ['userId'], // Select minimal patient info
                        include: [{
                            model: UserModel,
                            as: 'userInfo', // Make sure this alias matches your association setup
                            attributes: ['name'] // Select only the user's name
                        }],
                        required: true // Ensures only reviews by active patients are returned
                    }
                ],
                limit: limit,
                offset: offset
            });

            // Map and flatten the data for a cleaner API response
            return reviews.map(review => {
                const reviewData = review.toJSON();
                reviewData.patientName = reviewData.patientInfo?.userInfo?.name;
                delete reviewData.patientInfo; // Remove nested patient object
                return reviewData;
            });
        } catch (error) {
            console.error('Error fetching doctor reviews:', error);
            throw new Error(`Failed to retrieve doctor reviews: ${error.message}`);
        }
    }

    static async updateReview(reviewId, updates, updatedByUserId) {
        let transaction;
        try {
            if (updates.rating !== undefined && (typeof updates.rating !== 'number' || updates.rating < 1 || updates.rating > 5)) {
                throw new Error('Rating must be a number between 1 and 5.');
            }

            transaction = await sequelize.transaction();

            // Find the review to get the doctorId for summary update later
            const existingReview = await DoctorReviewModel.findByPk(reviewId, { transaction });
            if (!existingReview) {
                await transaction.rollback();
                return false; // Review not found
            }

            // Prepare updates object, ensuring update_date and update_user are included
            const fieldsToUpdate = {
                ...updates, // Include rating and comment if present
                update_date: new Date(), // Use new Date()
                update_user: updatedByUserId
            };

            const [affectedRows] = await DoctorReviewModel.update(fieldsToUpdate, {
                where: { reviewId: reviewId, status_flag: 1 }, // Only update active reviews
                transaction // Pass transaction
            });

            if (affectedRows > 0) {
                // Recalculate and update doctor's reviews summary after update
                await DoctorReviewRepository.updateDoctorReviewsSummary(existingReview.doctorId, updatedByUserId, transaction); // Pass transaction
            }

            await transaction.commit();
            return affectedRows > 0;
        } catch (error) {
            if (transaction) await transaction.rollback(); // Rollback on error
            console.error('Error updating review:', error);
            throw new Error(`Failed to update doctor review: ${error.message}`);
        }
    }

    static async deactivateReview(reviewId, deletedByUserId) {
        let transaction;
        try {
            transaction = await sequelize.transaction();

            const review = await DoctorReviewModel.findByPk(reviewId, { transaction });
            if (!review) {
                await transaction.rollback();
                return false;
            }
            const doctorId = review.doctorId;

            const [affectedRows] = await DoctorReviewModel.update(
                { status_flag: 0, update_date: new Date(), update_user: deletedByUserId }, // Use new Date()
                {
                    where: { reviewId: reviewId, status_flag: 1 }, // Only deactivate active reviews
                    transaction // Pass transaction
                }
            );

            if (affectedRows > 0) {
                // Recalculate and update doctor's reviews summary after deactivation
                await DoctorReviewRepository.updateDoctorReviewsSummary(doctorId, deletedByUserId, transaction); // Pass transaction
            }

            await transaction.commit();
            return affectedRows > 0;
        } catch (error) {
            if (transaction) await transaction.rollback(); // Rollback on error
            console.error('Error deactivating review:', error);
            throw new Error(`Failed to deactivate review: ${error.message}`);
        }
    }

    static async updateDoctorReviewsSummary(doctorId, performingUserId, transaction) {
        try {
            const reviewsSummary = await DoctorReviewModel.findAll({
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('reviewId')), 'totalReviews'],
                    [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating']
                ],
                where: {
                    doctorId: doctorId,
                    status_flag: 1 // Only consider active reviews
                },
                group: ['doctorId'], // Group by doctorId to get summary per doctor
                transaction // IMPORTANT: Use the passed transaction
            });

            
            let totalReviews = 0;
            let averageRating = 0;

            if (reviewsSummary && reviewsSummary.length > 0 && reviewsSummary[0].dataValues) {
                totalReviews = reviewsSummary[0].dataValues.totalReviews || 0;

                
                if (reviewsSummary[0].dataValues.averageRating !== null && typeof reviewsSummary[0].dataValues.averageRating === 'number') {
                    averageRating = parseFloat(reviewsSummary[0].dataValues.averageRating.toFixed(2));
                }
            }
            
            const [affectedRows] = await DoctorModel.update(
                {
                    reviews: totalReviews,
                    averageRating: averageRating,
                    update_date: new Date(),
                    update_user: performingUserId
                },
                {
                    where: { userId: doctorId },
                    transaction
                }
            );

            if (affectedRows === 0) {
                console.warn(`Warning: Doctor with ID ${doctorId} not found or not updated while updating review summary.`);
            }
            return affectedRows > 0;
        } catch (error) {
            console.error(`Error updating doctor reviews summary for doctor ${doctorId}:`, error);
            throw error;
        }
    }
}

module.exports = {
    DoctorReviewModel,
    DoctorReviewRepository
};