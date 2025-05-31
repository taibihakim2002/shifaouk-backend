const errorCodes = require("../constants/errorCodes");
const User = require("../models/userModel");
const APIFeatures = require("../utils/APIfeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");




exports.getTopDoctors = catchAsync(async (req, res, next) => {

    // !edite-here وضعتها وحدها لان الاطباء المميزون قد يتغير منطقهم
    const features = new APIFeatures(User.find({
        role: "doctor",
        "doctorProfile.status": "approved"
    }), req.query).filter().sort().limitFields().paginate()
    const users = await features.query;
    res.status(200).json({ status: "success", results: users.length, data: users })
})

exports.getAllApprovedDoctors = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(User.find({
        role: "doctor",
        "doctorProfile.status": "approved"
    }), req.query).filter().sort().limitFields().paginate()
    const users = await features.query;
    res.status(200).json({ status: "success", results: users.length, data: { users } })
})

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
exports.getdoctorByRequestId = catchAsync(async (req, res, next) => {
    const { requestId } = req.params;
    if (!requestId) {
        return next(new AppError("الطلب غير صالح: requestId مفقود", 400));
    }
    const user = await User.findOne({ role: "doctor", "doctorProfile.requestId": requestId })
    if (!user) {
        return next(new AppError("User Not Found", 401))
    }
    res.status(200).json({ status: "success", data: user })
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


exports.updateDoctorAvailability = catchAsync(async (req, res, next) => {
    const doctorId = req.params.doctorId;

    const { availability, slotDurationInMinutes, bookingInstructions } = req.body;


    if (!availability) {
        return next(new AppError("بيانات التوفر مطلوبة.", 400));
    }


    const updateData = {
        "doctorProfile.availability": availability,
        "doctorProfile.slotDurationInMinutes": slotDurationInMinutes,
        "doctorProfile.bookingInstructions": bookingInstructions
    };

    const updatedDoctor = await User.findByIdAndUpdate(
        doctorId,
        updateData,
        { new: true, runValidators: true }
    );

    if (!updatedDoctor) {
        return next(new AppError("Doctor Not Found", 404));
    }

    res.status(200).json({
        status: "success",
        data: updatedDoctor,
    });
});
exports.approveDoctor = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;

    const doctor = await User.findById(doctorId);

    if (!doctor || doctor.role !== "doctor") {
        return next(new AppError("الطبيب غير موجود", 404, errorCodes.NOT_FOUND_DOCTOR));
    }

    if (doctor.doctorProfile.status !== "pending") {
        return next(new AppError("تمت دراسة ملف هذا الطبيب مسبقًا", 400, errorCodes.BUSINESS_DOCTOR_ALREADY_REVIEWED));
    }

    const updatedDoctor = await User.findByIdAndUpdate(
        doctorId,
        {
            "doctorProfile.status": "approved",
            "doctorProfile.rejectionReason": ""
        },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        status: "success",
        message: "تمت الموافقة على الطبيب",
        data: { doctor: updatedDoctor }
    });
});
exports.rejectDoctor = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;
    const { reason } = req.body;

    const doctor = await User.findById(doctorId);

    if (!doctor || doctor.role !== "doctor") {
        return next(new AppError("الطبيب غير موجود", 404, errorCodes.NOT_FOUND_DOCTOR));
    }

    if (doctor.doctorProfile.status !== "pending") {
        return next(new AppError("تمت دراسة ملف هذا الطبيب مسبقًا", 400, errorCodes.BUSINESS_DOCTOR_ALREADY_REVIEWED));
    }

    const updatedDoctor = await User.findByIdAndUpdate(
        doctorId,
        {
            "doctorProfile.status": "rejected",
            "doctorProfile.rejectionReason": reason || ""
        },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        status: "success",
        message: "تم رفض الطبيب",
        data: { doctor: updatedDoctor }
    });
});


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
