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
    const approvedRequests = await ChargeRequest.countDocuments({
        status: "approved",
    });
    const rejectedRequests = await ChargeRequest.countDocuments({
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

exports.getDoctorHomeStats = catchAsync(async (req, res, next) => {

    const doctorId = req.user.id;

    const uniquePatientIds = await Consultation.distinct("patient", { doctor: doctorId, status: 'completed' });
    const totalUniquePatients = uniquePatientIds.length;
    const pendingConsultationsCount = await Consultation.countDocuments({
        doctor: doctorId,
        status: 'pending'
    });

    const ConfirmedConsultationsCount = await Consultation.countDocuments({
        doctor: doctorId,
        status: { $in: ['confirmed'] }
    });



    const wallet = await Wallet.findOne({ user: doctorId });
    if (wallet) {
        walletBalance = wallet.balance;
    }

    res.status(200).json({
        status: "success",
        data: {
            totalPatients: totalUniquePatients, // عدد المرضى الفريدين
            pendingRequests: pendingConsultationsCount, // طلبات الاستشارة المعلقة
            confirmedConsultationsCount: ConfirmedConsultationsCount, // الطلبات المقبولة/المكتملة
            walletBalance: walletBalance,
        }
    });
});

exports.getPatientHomeStats = catchAsync(async (req, res, next) => {

    const patientId = req.user.id;


    const completedConsultationsCount = await Consultation.countDocuments({
        patient: patientId,
        status: { $in: ['completed'] }
    });

    const user = await User.findById(patientId).select('patientProfile.favoriteDoctors');

    const favoriteDoctorsCount = user?.patientProfile?.favoriteDoctors?.length || 0;

    const wallet = await Wallet.findOne({ user: patientId });
    if (wallet) {
        walletBalance = wallet.balance;
    }

    res.status(200).json({
        status: "success",
        data: {
            completedConsultations: completedConsultationsCount,
            totalfavoriteDoctors: favoriteDoctorsCount,
            walletBalance: walletBalance,
        }
    });
});

