const errorCodes = require("../constants/errorCodes");
const User = require("../models/userModel");
const APIFeatures = require("../utils/APIfeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");


exports.getAllUsers = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(User.find(), req.query).filter().sort().limitFields().paginate()
    const users = await features.query;
    res.status(200).json({ status: "success", results: users.length, data: { users } })
})

exports.createUser = catchAsync(async (req, res) => {
    const data = req.body
    const user = await User.create(data);
    res.status(201).json({ status: "success", data: { user: user } })
})
exports.getUserById = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)

    if (!user) {
        return next(new AppError("User not found", 404, errorCodes.NOT_FOUND_USER))
    }
    res.status(200).json({ status: "Success", data: { user } })
})
exports.deleteUser = catchAsync(async (req, res) => {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
        return next(new AppError("User not found", 404))
    }
    res.status(200).json({ status: 200, message: "deleted User" })

})
exports.updateUser = catchAsync(async (req, res) => {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })
    if (!updated) {
        return next(new AppError("User not found", 404, errorCodes.NOT_FOUND_USER))
    }
    res.status(200).json({ status: "success", data: { updated } })

})


// Aggregation
exports.getUsersStats = catchAsync(async (req, res) => {

    const aggregate = await User.aggregate([
        {
            $group: {
                _id: "$location.country",
                count: { $sum: 1 }
            }
        }
    ])
    res.status(200).json({ status: "success", results: aggregate.length, data: { aggregate } })
})
