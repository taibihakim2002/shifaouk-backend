const express = require("express");
const morgan = require("morgan");
const userRouter = require("./routes/userRoutes");
const consultationRouter = require("./routes/consultationRoutes");
const authRouter = require("./routes/authRoutes")
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const authController = require("./controllers/authController");
const cookieParser = require("cookie-parser");
const cors = require('cors');
const app = express()

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(authController.onlyFrontend)

app.use(cookieParser());
if (process.env.NODE_ENV === 'development') {
    app.use(morgan("dev"))
}



// app.use(express.static("./public"))
app.use(express.json());
app.use("/api/v1/users", userRouter)
app.use("/api/v1/consultations", consultationRouter)
app.use("/api/v1/auth", authRouter)
// This is a handler for other routes (Handling Unhandled Routes)
app.all("*", (req, res, next) => {
    next(new AppError(`This route is not handled ${req.originalUrl}`, 504))
})

app.use(globalErrorHandler)
module.exports = app

