const errorCodes = require("../constants/errorCodes");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const APIFeatures = require("../utils/APIfeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");




exports.getdoctorById = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id)
    if (!user) {
        return next(new AppError("Doctor not found", 404, errorCodes.NOT_FOUND_DOCTOR))
    }
    res.status(200).json({ status: "Success", data: user })
})

exports.getTopDoctors = catchAsync(async (req, res, next) => {


    const features = new APIFeatures(User.find({
        role: "doctor",
        "doctorProfile.status": "approved"
    }), req.query).filter().sort().limitFields().paginate()
    const users = await features.query;
    res.status(200).json({ status: "success", results: users.length, data: users })
})

// افترض أن لديك catchAsync و AppError و User model وكلاس APIFeatures معرفة

exports.getAllApprovedDoctors = catchAsync(async (req, res, next) => {
    const mongoFilterConditions = {
        role: "doctor",
        "doctorProfile.status": "approved"
    };

    const queryForAPIFeatures = { ...req.query };

    if (req.query.priceRange) {
        const priceRangeValue = req.query.priceRange;
        const priceCondition = {};
        const [minStr, maxStr] = priceRangeValue.split('-');

        const minPrice = parseInt(minStr, 10);
        if (!isNaN(minPrice)) {
            priceCondition.$gte = minPrice;
        }
        if (maxStr && maxStr.toLowerCase() !== 'infinity') {
            const maxPrice = parseInt(maxStr, 10);
            if (!isNaN(maxPrice)) {
                priceCondition.$lte = maxPrice;
            }
        }
        if (Object.keys(priceCondition).length > 0) {
            mongoFilterConditions["doctorProfile.consultationPrice"] = priceCondition;
        }
        delete queryForAPIFeatures.priceRange;
    }


    if (req.query.minRating) {
        const rating = parseInt(req.query.minRating, 10);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            mongoFilterConditions["doctorProfile.rating"] = { $gte: rating };
        }
        delete queryForAPIFeatures.minRating;
    }

    // معالجة Search
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim() !== '') {
        const searchRegex = new RegExp(req.query.search.trim(), 'i'); // 'i' لتجاهل حالة الأحرف
        mongoFilterConditions.$or = [
            { "fullName.first": searchRegex },
            { "fullName.second": searchRegex },
            { "doctorProfile.specialization": searchRegex },
            { "doctorProfile.workplace": searchRegex },
        ];
        delete queryForAPIFeatures.search;
    }


    if (req.query.specialization) {
        mongoFilterConditions["doctorProfile.specialization"] = req.query.specialization;
        delete queryForAPIFeatures.specialization;
    }

    if (req.query.state) {
        mongoFilterConditions.state = req.query.state;
        delete queryForAPIFeatures.state;
    }

    if (req.query.gender) {
        mongoFilterConditions.gender = req.query.gender;
        delete queryForAPIFeatures.gender;
    }

    const features = new APIFeatures(User.find(mongoFilterConditions), queryForAPIFeatures)
        .filter()
        .sort()
        .limitFields()
        .paginate();

    const users = await features.query;
    const totalDocs = await User.countDocuments(mongoFilterConditions);

    const limit = parseInt(queryForAPIFeatures.limit, 10) || parseInt(process.env.DEFAULT_PAGE_LIMIT, 10) || 9;
    const totalPages = Math.ceil(totalDocs / limit);

    res.status(200).json({
        status: "success",
        results: users.length,
        totalDocs,
        totalPages,
        currentPage: parseInt(queryForAPIFeatures.page, 10) || 1,
        data: { users }
    });
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(User.find(), req.query).filter().sort().limitFields().paginate()
    const users = await features.query;
    res.status(200).json({ status: "success", results: users.length, data: { users } })
})

exports.createUser = catchAsync(async (req, res) => {
    const data = req.body
    const user = await User.create(data);

    await Wallet.create({
        user: user._id
    });

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
exports.updateDoctor = catchAsync(async (req, res) => {

    const updateData = {
        'fullName.first': req.body?.fullName?.first,
        'fullName.second': req.body?.fullName?.second,
        'email': req.body?.email,
        'phone': req.body?.phone,
        'state': req.body?.state,
        "gender": req.body?.gender,
        'city': req.body?.city,
        "address": req.body?.address,
        'profileImage': req.body?.profileImage,
        'language': req.body?.language,
        'doctorProfile.specialization': req.body?.doctorProfile?.specialization,
        'doctorProfile.experienceYears': req.body?.doctorProfile?.experienceYears,
        'doctorProfile.workplace': req.body?.doctorProfile?.workplace,
        'doctorProfile.doctorBio': req.body?.doctorProfile?.doctorBio,
    };


    const updated = await User.findOneAndUpdate(
        { _id: req.params.id, role: "doctor" },
        updateData,
        {
            new: true,
            runValidators: true,
        }
    );
    if (!updated) {
        return next(new AppError("Doctor not found", 404, errorCodes.NOT_FOUND_DOCTOR))
    }
    res.status(200).json({ status: "success", data: { updated } })

})


exports.updateDoctorAvailability = catchAsync(async (req, res, next) => {
    const doctorId = req.params.doctorId;

    const { availability, slotDurationInMinutes, bookingInstructions, consultationPrice } = req.body;

    if (!availability) {
        return next(new AppError("بيانات التوفر مطلوبة.", 400));
    }


    const updateData = {
        "doctorProfile.availability": availability,
        "doctorProfile.slotDurationInMinutes": slotDurationInMinutes,
        "doctorProfile.bookingInstructions": bookingInstructions,
        "doctorProfile.consultationPrice": consultationPrice
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
