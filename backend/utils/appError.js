class AppError extends Error {
    constructor(message, statusCode) {
        super(message); // Call the parent constructor (Error)

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Mark as operational error (known error)

        // Capture the stack trace, excluding the constructor call itself
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;