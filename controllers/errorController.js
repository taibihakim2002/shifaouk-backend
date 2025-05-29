const errorCodes = require("../constants/errorCodes")
const AppError = require("../utils/appError")
const sendErrorDev = (err, req, res, next) => {
    if (err?.isOperational) {
        return res.status(err.statusCode).json({ status: err.status, message: err.message, error: err, stack: err.stack })
    } else {
        console.error("ERROR 🔥", err)
        return res.status(500).json({
            status: err.status, message: err.message || "Something went wrong", error: err, stack: err.stack,
        })
    }
}
const sendErrorPro = (err, req, res, next) => {
    if (err?.isOperational) {
        return res.status(err.statusCode).json({ status: err.status, message: err.message, code: err.code })
    } else {

        return res.status(500).json({
            status: "error", message: "Something went wrong", code: 1999
        })
    }
}

module.exports = (err, req, res, next) => {
    console.log(err)
    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, req, res, next);
    } else if (process.env.NODE_ENV === "production") {
        let error;
        if (err.name === "MulterError") {
            let message = "Error when uploading files";
            let code = errorCodes.UPLOAD_ERROR;

            if (err.code === "LIMIT_FILE_SIZE") {
                message = "File size is too large";
                code = errorCodes.UPLOAD_FILE_TOO_LARGE;
            } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
                console.log(err)
                message = "Unexpected file field";
                code = errorCodes.UPLOAD_UNEXPECTED_FIELD;
            }

            error = new AppError(message, 400, code);
        }

        // 🔴 Custom file filter error (e.g., unsupported MIME type)
        else if (err.message?.includes("نوع الملف غير مدعوم")) {
            error = new AppError(err.message, 400, errorCodes.UPLOAD_UNSUPPORTED_TYPE);
        }

        // 🟡 MongoDB Cast Error (invalid ObjectId)
        else if (err.name === "CastError") {
            error = new AppError(`Invalid ${err.path}: ${err.value}`, 404, errorCodes.VALIDATION_INVALID_ID);
        }

        // 🔵 MongoDB Duplicate Key Error (email or phone)
        else if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            const value = err.keyValue[field];

            if (field === "email") {
                error = new AppError(`The email: ${value} already exists. Please use a different one.`, 404, errorCodes.VALIDATION_DUPLICATE_EMAIL);
            } else if (field === "phone") {
                error = new AppError(`The phone: ${value} already exists. Please use a different one.`, 404, errorCodes.VALIDATION_DUPLICATE_PHONE);
            } else {
                error = new AppError(`The ${field}: ${value} already exists. Please use a different one.`, 404, errorCodes.VALIDATION_DUPLICATE_VALUE);
            }
        }

        // 🟣 Mongoose Validation Error
        else if (err.name === "ValidationError") {
            error = new AppError(err.message, 404, errorCodes.VALIDATION_INVALID_DATA);
        }

        // ⚫ Unknown or unexpected error
        else {
            error = err;
        }

        sendErrorPro(error, req, res, next);
    }
}
