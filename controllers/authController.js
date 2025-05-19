const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync")
const bcrypt = require("bcryptjs")

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};


const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);


    const cookieOptions = {
        httpOnly: true,
        // secure: process.env.NODE_ENV === 'production',
        secure: false,
        // sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    };

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        message: 'You are logged in',
        user,
    });
};


exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;


    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }


    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
});
exports.register = catchAsync(async (req, res, next) => {
    const newUser = { ...req.body }
    newUser.role = "patient";
    const user = await User.create(newUser);

    createSendToken(user, 201, res);
});


exports.protect = catchAsync(async (req, res, next) => {
    let token = req.cookies.jwt;
    if (!token) {
        return next(new AppError('You are not logged in', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.id);
        const expTimestamp = decoded.exp * 1000;
        const expiryDate = new Date(expTimestamp);

        console.log(expiryDate.toString());
        if (!currentUser) {
            return next(new AppError('The user does not exist', 401));
        }

        req.user = currentUser;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Your token has expired! Please log in again.', 401));
        }
        return next(new AppError('Invalid token! Please log in again.', 401));
    }
});

exports.onlyFrontend = catchAsync(async (req, res, next) => {
    const clientKey = req.get('x-api-key');

    if (!clientKey || clientKey !== process.env.FRONTEND_API_KEY) {
        return next(new AppError("Unauthorized access", 401))
    }
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission', 403));
        }
        next();
    };
};