const Consultation = require("../models/consultationModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");

exports.getOverviewStats = catchAsync(async (req, res, next) => {
    const approvedDoctors = await User.countDocuments({
        role: "doctor",
        "doctorProfile.status": "approved",
    });
    const pendingDoctors = await User.countDocuments({
        role: "doctor",
        "doctorProfile.status": "pending",
    });
    const totalPatients = await User.countDocuments({
        role: "patient",
    });
    const CompletedConsultations = await Consultation.countDocuments({
        status: "completed",
    });
    const ConfirmedConsultations = await Consultation.countDocuments({
        status: "confirmed",
    });

    res.status(200).json({
        status: "success", data: {
            approvedDoctors,
            pendingDoctors,
            totalPatients,
            CompletedConsultations,
            ConfirmedConsultations,
        }
    })

})