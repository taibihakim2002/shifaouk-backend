const errorCodes = require("../constants/errorCodes");
const Consultation = require("../models/consultationModel");
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
            { "email": searchRegex },
            { "phone": searchRegex },
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
    res.status(200).json({ status: "success", data: updated })

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



exports.getAvailableSlots = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
        return next(new AppError('يرجى تحديد التاريخ المطلوب', 400));
    }


    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
        return next(new AppError('الطبيب غير موجود', 404));
    }

    const availability = doctor.doctorProfile.availability;
    const slotDuration = doctor.doctorProfile.slotDurationInMinutes;
    const breakMinutes = 5;

    const dayOfWeek = new Date(date)
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toLowerCase();


    // const dayAvailability = availability.find((a) => a.day === dayOfWeek);



    // if (!dayAvailability) {
    //     return res.status(200).json({ slots: [] });
    // }

    // // إنشاء كل المواعيد الممكنة
    // const fromMinutes = parseTime(dayAvailability.from);
    // const toMinutes = parseTime(dayAvailability.to);

    // const allSlots = [];
    // let current = fromMinutes;
    // while (current + slotDuration <= toMinutes) {
    //     const slotStart = addMinutesToDate(date, current);
    //     allSlots.push(slotStart);
    //     current += slotDuration + breakMinutes;
    // }

    const dayAvailabilities = availability.filter((a) => a.day === dayOfWeek);

    if (!dayAvailabilities.length) {
        return res.status(200).json({ slots: [] });
    }

    const allSlots = [];

    // dayAvailabilities.forEach(({ from, to }) => {
    //     const fromMinutes = parseTime(from);
    //     const toMinutes = parseTime(to);
    //     let current = fromMinutes;

    //     while (current + slotDuration <= toMinutes) {
    //         const slotStart = addMinutesToDate(date, current);
    //         allSlots.push(slotStart);
    //         current += slotDuration + breakMinutes;
    //     }
    // });
    const now = new Date();
    const isToday = new Date(date).toDateString() === now.toDateString();

    dayAvailabilities.forEach(({ from, to }) => {
        const fromMinutes = parseTime(from);
        const toMinutes = parseTime(to);
        let current = fromMinutes;

        while (current + slotDuration <= toMinutes) {
            const slotStart = addMinutesToDate(date, current);

            // إذا كان اليوم هو اليوم الحالي، فتأكد أن التوقيت في المستقبل
            if (!isToday || slotStart > now) {
                allSlots.push(slotStart);
            }

            current += slotDuration + breakMinutes;
        }
    });
    // تحديد بداية ونهاية اليوم
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // جلب الحجوزات الحالية للطبيب في هذا اليوم
    const booked = await Consultation.find({
        doctor: doctorId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed'] },
    });
    // edit
    const bookedTimes = booked.map((c) => c.date.toISOString().slice(11, 16))

    // إعادة جميع الأوقات مع حالتها
    const slotsWithStatus = allSlots.map((slot) => {
        const timeStr = slot.toISOString().slice(11, 16);
        return {
            time: slot.toISOString(), // يمكنك تنسيقه في الفرونت
            isBooked: bookedTimes.includes(timeStr),
        };
    });



    // const bookedTimes = booked.map(c => new Date(c.date).getTime());

    // const slotsWithStatus = allSlots.map(slot => {
    //     const isBooked = bookedTimes.includes(slot.getTime());
    //     return {
    //         time: slot.toISOString(),
    //         isBooked,
    //     };
    // });


    res.status(200).json({
        status: "success",
        slots: slotsWithStatus,
    });
});

function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function addMinutesToDate(baseDateStr, minutes) {
    const date = new Date(baseDateStr);
    date.setHours(0, 0, 0, 0);
    return new Date(date.getTime() + minutes * 60000);
}




exports.getAllPatients = catchAsync(async (req, res, next) => {
    const mongoFilterConditions = {
        role: "patient",
        // !edit-here | يجب تعديلها عندما نظيف خاصية حضر المستخدمين
    };
    const queryForAPIFeatures = { ...req.query };

    // معالجة Search
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim() !== '') {
        const searchRegex = new RegExp(req.query.search.trim(), 'i'); // 'i' لتجاهل حالة الأحرف
        mongoFilterConditions.$or = [
            { "fullName.first": searchRegex },
            { "fullName.second": searchRegex },
            { "email": searchRegex },
            { "phone": searchRegex },
        ];
        delete queryForAPIFeatures.search;
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
        data: users
    });
});
exports.getPatientById = catchAsync(async (req, res, next) => {

    const { id } = req.params

    const user = await User.findById(id).populate('wallet');
    if (!user) {
        return next(new AppError("user not found"))
    }
    res.status(200).json({
        status: "success",
        data: user
    });
});
exports.adminUpdatePatient = catchAsync(async (req, res, next) => {


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
    };


    const updated = await User.findOneAndUpdate(
        { _id: req.params.id, role: "patient" },
        updateData,
        {
            new: true,
            runValidators: true,
        }
    );
    if (!updated) {
        return next(new AppError("User not found", 404, errorCodes.NOT_FOUND_USER))
    }
    res.status(200).json({ status: "success", data: updated })
});

exports.updatePatient = catchAsync(async (req, res, next) => {
    const body = req.body;
    await User.updateOne(
        { _id: req.user._id, role: "patient", patientProfile: null },
        { $set: { patientProfile: {} } }
    );
    const parseMultiline = (str) =>
        str?.split("\n").map((line) => line.trim()).filter(Boolean) || [];




    const updateData = {
        "fullName.first": body.firstName,
        "fullName.second": body.lastName,
        email: body.email,
        phone: body.phone,
        gender: body.gender,
        state: body.state,
        city: body.city,
        address: body.address,
        birthDate: body.birthDate,
        "patientProfile.bloodType": body.bloodType,
        "patientProfile.medicalHistory": parseMultiline(body.medicalHistory),
        "patientProfile.surgeries": parseMultiline(body.surgeries),
        "patientProfile.familyHistory": parseMultiline(body.familyHistory),
        "patientProfile.allergies": parseMultiline(body.allergies),
        "patientProfile.chronicDiseases": parseMultiline(body.chronicDiseases),
        "patientProfile.currentMedications": parseMultiline(body.currentMedications),
    };

    // Handle profile image
    if (req.files?.profileImage?.[0]?.path) {
        updateData.profileImage = req.files.profileImage[0].path;
    }

    // Handle new uploaded medical files
    if (req.files?.files) {
        const { files } = req.files;

        const fileNames = req.body.fileNames || [];
        const fileDates = req.body.fileDates || [];

        const formattedFiles = files.map((file, index) => ({
            url: file.path,
            name: Array.isArray(fileNames) ? fileNames[index] : fileNames,
            date: new Date(
                Array.isArray(fileDates) ? fileDates[index] : fileDates
            ),
        }));

        // 🟡 دمج الملفات الجديدة مع الملفات القديمة
        const userDoc = await User.findById(req.user._id).lean();
        const existingFiles = userDoc?.patientProfile?.uploadedFiles || [];

        updateData["patientProfile.uploadedFiles"] = [...existingFiles, ...formattedFiles];
    }

    const user = await User.findById(req.user._id)

    const updated = await User.findOneAndUpdate(
        { _id: req.user._id, role: "patient" },
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!updated) {
        return next(
            new AppError("User not found", 404)
        );
    }

    res.status(200).json({ status: "success", data: updated });
});



exports.updateDoctorProfile = catchAsync(async (req, res, next) => {
    const body = req.body;



    // في حال لم يتم إعداد ملف doctorProfile سابقًا
    await User.updateOne(
        { _id: req.user._id, role: "doctor", doctorProfile: null },
        { $set: { doctorProfile: {} } }
    );




    const updateData = {
        "fullName.first": body.firstName,
        "fullName.second": body.lastName,
        gender: body.gender,
        phone: body.phone,
        state: body.state,
        city: body.city,
        address: body.address,
        birthDate: body.birthDate,

        // Doctor profile updates
        "doctorProfile.specialization": body.doctorProfile.specialization,
        "doctorProfile.experienceYears": Number(body.doctorProfile.experienceYears),
        "doctorProfile.clinicAddress": body.doctorProfile.clinicAddress,
        "doctorProfile.workplace": body.doctorProfile.workplace,
        "doctorProfile.consultationPrice": Number(body.doctorProfile.consultationPrice),
        "doctorProfile.slotDurationInMinutes": Number(body.doctorProfile.slotDurationInMinutes),
        "doctorProfile.doctorBio": body.doctorProfile.doctorBio,
        "doctorProfile.bookingInstructions": body.doctorProfile.bookingInstructions || "",
    };


    if (req.file?.path) {
        updateData.profileImage = req.file.path;
    }

    const updated = await User.findOneAndUpdate(
        { _id: req.user._id, role: "doctor" },
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!updated) {
        return next(new AppError("لم يتم العثور على الطبيب", 404));
    }

    res.status(200).json({ status: "success", data: updated });
});


exports.getDoctorPatients = catchAsync(async (req, res, next) => {
    const doctorId = req.user._id;

    const patients = await Consultation.aggregate([
        {
            $match: {
                doctor: doctorId,
                status: "completed"
            }
        },
        {
            $sort: { date: -1 } // الأحدث أولًا
        },
        {
            $group: {
                _id: "$patient",
                consultationsCount: { $sum: 1 },
                lastConsultationDate: { $first: "$date" },
                lastConsultationId: { $first: "$_id" },
                lastConsultationStatus: { $first: "$status" } // ✅ إضافة حالة آخر استشارة
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "patientInfo"
            }
        },
        { $unwind: "$patientInfo" },

        {
            $lookup: {
                from: "consultationreports",
                localField: "lastConsultationId",
                foreignField: "consultation",
                as: "lastReport"
            }
        },
        {
            $unwind: {
                path: "$lastReport",
                preserveNullAndEmptyArrays: true
            }
        },

        {
            $project: {
                _id: "$patientInfo._id",
                fullName: "$patientInfo.fullName",
                name: "$patientInfo.name",
                email: "$patientInfo.email",
                phone: "$patientInfo.phone",
                gender: "$patientInfo.gender",
                state: "$patientInfo.state",
                city: "$patientInfo.city",
                birthDate: "$patientInfo.birthDate",
                profileImage: "$patientInfo.profileImage",
                createdAt: "$patientInfo.createdAt",
                consultationsCount: 1,
                lastConsultationDate: 1,
                lastConsultationStatus: 1, // ✅ عرض حالة الاستشارة
                lastDiagnosis: "$lastReport.diagnosis",
                lastPatientCondition: "$lastReport.patientCondition"
            }
        }
    ]);

    res.status(200).json({
        status: "success",
        results: patients.length,
        data: patients
    });
});


exports.toggleFavoriteDoctor = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    if (!user || user.role !== "patient") {
        return next(new AppError("غير مصرح لك بتنفيذ هذا الإجراء", 403));
    }

    const doctorId = req.params.doctorId;

    // تحقق من وجود طبيب بهذا المعرف
    const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
    if (!doctor) {
        return next(new AppError("الطبيب غير موجود", 404));
    }

    const favorites = user.patientProfile.favoriteDoctors.map(id => id.toString());
    const index = favorites.indexOf(doctorId);

    let action;

    if (index > -1) {
        // الطبيب موجود → نقوم بالإزالة
        user.patientProfile.favoriteDoctors.splice(index, 1);
        action = "removed";
    } else {
        // الطبيب غير موجود → نقوم بالإضافة
        user.patientProfile.favoriteDoctors.push(doctorId);
        action = "added";
    }

    await user.save();

    res.status(200).json({
        status: "success",
        action, // 'added' or 'removed'
        message: action === "added" ? "تمت إضافة الطبيب إلى المفضلة" : "تمت إزالة الطبيب من المفضلة"
    });
});

exports.getFavoriteDoctors = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id).populate("patientProfile.favoriteDoctors");

    if (!user || !user.patientProfile) {
        return next(new AppError("المستخدم غير موجود أو ليس مريضًا", 404));
    }

    res.status(200).json({
        status: "success",
        data: user.patientProfile.favoriteDoctors,
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
