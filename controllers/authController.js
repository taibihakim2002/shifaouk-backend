const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync")
const bcrypt = require("bcryptjs")
exports.login = catchAsync(async (req, res, next) => {

    const query = await User.findOne({ email: req.body.email });
    if (!query) {
        return next(new AppError("You Email Adress Is Incorrect", 404))
    }
    const user = query.toObject();
    const compareResult = await bcrypt.compare(req.body.password || "", user.password)
    if (compareResult) {
        delete user.password;
        return res.status(200).json({ status: "success", message: "You Are Logged In", user: user })
    } else {
        return next(new AppError("Your Password is not correct", 404))
    }

})
exports.register = catchAsync(async (req, res, next) => {
    const query = await User.create(req.body);
    const user = { ...query }
    delete user.password;
    res.status(200).json({ status: "success", message: "You are registed Now" })
})

