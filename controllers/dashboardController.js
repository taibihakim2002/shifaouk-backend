const ChargeRequest = require("../models/ChargeRequestModel");
const Consultation = require("../models/consultationModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const catchAsync = require("../utils/catchAsync");

exports.getAdminOverviewStats = catchAsync(async (req, res, next) => {
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
    const completedConsultations = await Consultation.countDocuments({
        status: "completed",
    });
    const confirmedConsultations = await Consultation.countDocuments({
        status: "confirmed",
    });

    const wallet = await Wallet.findOne({ user: process.env.PLATFORM_ID })
    let profites;
    if (wallet) {
        profites = wallet.balance;
    }
    res.status(200).json({
        status: "success", data: {
            approvedDoctors,
            pendingDoctors,
            totalPatients,
            completedConsultations,
            confirmedConsultations,
            profites
        }
    })

})

exports.getAdminWalletStats = catchAsync(async (req, res, next) => {
    const totalChargeRequests = await ChargeRequest.countDocuments({
    });
    const pendingRequests = await ChargeRequest.countDocuments({
        status: "pending",
    });
    const approvedRequests = await User.countDocuments({
        status: "approved",
    });
    const rejectedRequests = await Consultation.countDocuments({
        status: "rejected",
    });
    res.status(200).json({
        status: "success", data: {
            totalChargeRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
        }
    })

})