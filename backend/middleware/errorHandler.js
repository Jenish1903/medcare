const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    // Extract the duplicated field value, assuming it's in the error message
    const value = err.keyValue ? Object.values(err.keyValue)[0] : 'duplicate value';
    const message = `Duplicate field value: "${value}". Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err, message: err.message, name: err.name }; // Create a copy of the error

        // Handle specific database errors (if applicable, e.g., Mongoose errors, but adapt for MySQL)
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        // Note: MySQL errors are typically handled by checking error.code or message, not name
        // Example: if (error.code === 'ER_DUP_ENTRY') error = handleDuplicateFieldsDB(error);
        // For validation errors, you'd typically have custom validation that throws AppError directly.
        // For now, let's assume direct database errors are caught and re-thrown as AppError in models.

        sendErrorProd(error, res);
    }
};
