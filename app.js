const express = require("express");
const morgan = require("morgan");
const userRouter = require("./routes/userRoutes");
const consultationRouter = require("./routes/consultationRoutes");
const authRouter = require("./routes/authRoutes")
const dashboardRouter = require("./routes/dashboardRoutes")
const walletRouter = require("./routes/walletRoutes")
const chargeRequestRouter = require("./routes/chargeRequestRoutes")
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const authController = require("./controllers/authController");
const cookieParser = require("cookie-parser");
const cors = require('cors');
const app = express()

app.use(cors({
    origin: ["https://shifaouk.netlify.app/", 'http://localhost:5173'],
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
// This is a handler for other routes (Handling Unhandled Routes)
app.all("*", (req, res, next) => {
    next(new AppError(`This route is not handled ${req.originalUrl}`, 504))
})

app.use(globalErrorHandler)
module.exports = app

