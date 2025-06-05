const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync")
const errorCodes = require("../constants/errorCodes");
const path = require("path");
const fs = require("fs");
const specializations = require("../constants/specializations");
const Wallet = require("../models/walletModel");

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
        secure: true,
        sameSite: 'None',
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
        return next(new AppError('Incorrect email or password', 401, errorCodes.AUTH_INVALID_CREDENTIALS));
    }
    if (user.role === "doctor" && user.doctorProfile.status !== "approved") {
        return next(new AppError("your account is not approved", 401, errorCodes.BUSINESS_DOCTOR_ACCOUNT_NOT_APPROVED))
    }
    createSendToken(user, 200, res);
});

exports.registerPatient = catchAsync(async (req, res, next) => {
    const newUser = { ...req.body };
    newUser.role = "patient";

    const user = await User.create(newUser);


    await Wallet.create({
        user: user._id
    });

    createSendToken(user, 201, res);
});

exports.registerDoctor = catchAsync(async (req, res, next) => {
    const {
        name,
        prename,
        email,
        phone,
        password,
        state,
        city,
        address,
        gender,
        spec,
        exper,
        workplace,
        pio,
    } = req.body;

    const files = req.files;

    const getUrl = (key) => {
        if (!files || !files[key] || files[key].length === 0 || !files[key][0]?.path) {
            throw new AppError("الصور ضرورية للتسجيل", 400);
        }
        return files[key][0].path; // هنا نحصل على رابط Cloudinary المباشر
    };

    try {
        const arabicSpec = specializations.find((s) => s.value === spec)?.label || spec;

        const newDoctor = await User.create({
            role: "doctor",
            fullName: {
                first: name,
                second: prename,
            },
            email,
            phone,
            state,
            city,
            address,
            gender,
            password,
            profileImage: getUrl("profile"),
            doctorProfile: {
                specialization: arabicSpec,
                experienceYears: Number(exper),
                workplace: workplace,
                doctorBio: pio,
                licenseDocuments: [
                    getUrl("bac"),
                    getUrl("specCar"),
                    getUrl("profession"),
                ].filter(Boolean),
            },
        });

        const wallet = await Wallet.create({
            user: newDoctor._id,
        });

        res.status(201).json({
            status: "success",
            message: "تم تسجيل الطبيب بنجاح",
            data: newDoctor,
        });
    } catch (error) {
        next(error);
    }
});



exports.logout = catchAsync(async (req, res, next) => {
    res.cookie("jwt", "logout", {
        httpOnly: true,
        expires: new Date(Date.now() + 10 * 1000)
    })
    res.status(200).json({ status: 'success', message: 'Logged out successfully' })
})


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
    console.log(clientKey)
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





// 
exports.registerAdmin = catchAsync(async (req, res, next) => {

    const admin = { ...req.body };
    admin.role = "admin";
    const registredAdmin = await User.create(admin)
    res.status(200).json({ status: "success", data: registredAdmin })
})