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
    // if there are operational error we send error to client unless programming errors 
    if (err?.isOperational) {
        return res.status(err.statusCode).json({ status: err.status, message: err.message })
    } else {
        console.error("ERROR 🔥", err)
        return res.status(500).json({
            status: "error", message: "Something went wrong",
        })
    }
    // programming error don't send details to client
}

module.exports = (err, req, res, next) => {
    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, req, res, next)
    } else if (process.env.NODE_ENV === "production") {
        let error;
        // Handle the db error with type castError
        if (err.name === 'CastError') {
            error = new AppError(`Invalid ${err.path}: ${err.value}`, 404)
        }
        // Handle the db error with type Duplicated error

        if (err.code === 11000) {
            const field = Object.keys(err.errorResponse.keyPattern)[0]
            const keyValue = err.errorResponse.keyValue[field]
            error = new AppError(`The ${field}: ${keyValue} already exists , Please enter differente one , `, 404)
        }
        // Handle the db error with type validation error
        if (err.name === "ValidationError") {
            error = new AppError(err.message, 404)
        }
        sendErrorPro(error, req, res, next)
    }
}