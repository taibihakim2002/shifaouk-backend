class AppError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode || 500;
        this.status = this.statusCode.toString().startsWith("4") ? "fail" : "error";
        this.code = code || 1999;
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = AppError;