const express = require("express");
const morgan = require("morgan");
const userRouter = require("./routes/userRoutes");
const consultationRouter = require("./routes/consultationRoutes");
const authRouter = require("./routes/authRoutes")
const dashboardRouter = require("./routes/dashboardRoutes")
const walletRouter = require("./routes/walletRoutes")
const consultationReportRouter = require("./routes/consultationReportRoutes")
const chargeRequestRouter = require("./routes/chargeRequestRoutes")
const transactionRouter = require("./routes/transactionRoutes")
const messageRouter = require("./routes/messageRoutes")
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const authController = require("./controllers/authController");
const cookieParser = require("cookie-parser");
const cors = require('cors');
const app = express()

app.use(cors({
    // origin: "http://localhost:5173",
    origin: "https://shifaouk.netlify.app",
    credentials: true,

}));
app.use(express.static("./uploads"))


app.use(authController.onlyFrontend)

app.use(cookieParser());
if (process.env.NODE_ENV === 'development') {
    app.use(morgan("dev"))
}




app.use(express.json());
app.use("/api/v1/users", userRouter)
app.use("/api/v1/consultations", consultationRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/wallet", walletRouter)
app.use("/api/v1/charge", chargeRequestRouter)
app.use("/api/v1/consultation-reports", consultationReportRouter)
app.use("/api/v1/transaction", transactionRouter)
app.use("/api/v1/message", messageRouter)
// This is a handler for other routes (Handling Unhandled Routes)
app.all("*", (req, res, next) => {
    next(new AppError(`This route is not handled ${req.originalUrl}`, 504))
})

app.use(globalErrorHandler)
module.exports = app

