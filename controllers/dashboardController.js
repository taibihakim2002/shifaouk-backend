const Consultation = require("../models/consultationModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");

exports.getOverviewStats = catchAsync(async (req, res, next) => {
    // عدد الأطباء المقبولين
    const totalDoctors = await User.countDocuments({
        role: "doctor",
        "doctorProfile.approved": true,
    });

    // عدد المرضى
    const totalPatients = await User.countDocuments({
        role: "patient",
    });

    // عدد الاستشارات التي تمت
    const CompletedConsultations = await Consultation.countDocuments({
        status: "completed",
    });

    // عدد الاستشارات المجدولة
    const ConfirmedConsultations = await Consultation.countDocuments({
        status: "confirmed",
    });

    res.status(200).json({
        status: "success", data: {
            totalDoctors,
            totalPatients,
            CompletedConsultations,
            ConfirmedConsultations,
        }
    })

})