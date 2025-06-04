const { default: mongoose } = require("mongoose");
const Consultation = require("../models/consultationModel");
const APIFeatures = require("../utils/APIfeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Transaction = require("../models/transactionModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const errorCodes = require("../constants/errorCodes");



exports.getAllConsultations = catchAsync(async (req, res, next) => {

    const queryForAPIFeatures = { ...req.query };


    const mongoFilterConditions = {};

    // بحث نصي
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim() !== '') {
        const searchRegex = new RegExp(req.query.search.trim(), 'i');
        mongoFilterConditions.$or = [
            { "doctor.fullName.first": searchRegex },
            { "doctor.fullName.second": searchRegex },
            { "patient.fullName.first": searchRegex },
            { "patient.fullName.second": searchRegex },
        ];
        delete queryForAPIFeatures.search;
    }

    // فلترة حسب يوم محدد
    if (req.query.date) {
        const date = new Date(req.query.date); // ISO string قادم من React

        const start = new Date(date.setHours(0, 0, 0, 0));
        const end = new Date(date.setHours(23, 59, 59, 999));

        mongoFilterConditions.date = { $gte: start, $lte: end };
        delete queryForAPIFeatures.date;
    }
    // فلترة حسب الحالة
    if (req.query.status) {
        mongoFilterConditions.status = req.query.status;
        delete queryForAPIFeatures.status;
    }

    const features = new APIFeatures(Consultation.find(mongoFilterConditions), queryForAPIFeatures).filter().sort().limitFields().paginate();
    const consultations = await features.query.populate('doctor').populate('patient');
    res.status(200).json({ status: "success", results: consultations.length, data: consultations })
})
exports.getDoctorConsultations = catchAsync(async (req, res, next) => {
    const consultations = await Consultation.find({ doctor: req.params.doctor })
    if (!consultations) {
        return next(new AppError("No Consultations found", 404))
    }
    res.status(200).json({ status: "success", results: consultations.length, data: consultations })
})




exports.createConsultations = catchAsync(async (req, res, next) => {
    const { doctor, patient, date, type, notes } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 🧑‍⚕️ تحميل حساب الطبيب والمريض
        const doctorAccount = await User.findById(doctor).session(session);
        const patientAccount = await User.findById(patient).session(session);

        if (!doctorAccount || doctorAccount.role !== "doctor")
            return next(new AppError("Doctor not found", 404, errorCodes.NOT_FOUND_DOCTOR));

        if (!patientAccount || patientAccount.role !== "patient")
            return next(new AppError("Patient not found", 404, errorCodes.NOT_FOUND_USER));

        const consultationDate = new Date(date);
        if (consultationDate <= new Date())
            return next(new AppError("Date must be in the future", 400, errorCodes.BUSINESS_DATE_IN_PAST));

        const dayName = consultationDate.toLocaleString("en-US", { weekday: "short" }).toLowerCase();
        const availability = doctorAccount.doctorProfile?.availability || [];
        const appointmentStart = consultationDate.toTimeString().slice(0, 5);

        const foundSlot = availability.find(slot =>
            slot.day === dayName && appointmentStart >= slot.from && appointmentStart < slot.to
        );

        if (!foundSlot)
            return next(new AppError("Doctor not available", 400, errorCodes.BUSINESS_DOCTOR_NOT_AVAILABLE));

        const durationMinutes = doctorAccount.doctorProfile.slotDurationInMinutes;
        const consultationEnd = new Date(consultationDate.getTime() + durationMinutes * 60000);
        const buffer = 5 * 60 * 1000;

        const overlapping = await Consultation.findOne({
            doctorId: doctorAccount._id,
            date: {
                $gte: new Date(consultationDate.getTime() - durationMinutes * 60000 - buffer),
                $lt: new Date(consultationEnd.getTime() + buffer)
            },
            status: { $in: ["pending", "confirmed"] }
        }).session(session);

        if (overlapping)
            return next(new AppError("Slot already booked", 400, errorCodes.BUSINESS_ALREADY_BOOKED));

        const consultationPrice = doctorAccount.doctorProfile.consultationPrice;

        // 🧾 محفظة المريض
        const patientWallet = await Wallet.findOne({ user: patientAccount._id }).session(session);
        if (!patientWallet)
            return next(new AppError("Wallet not found", 404, errorCodes.BUSINESS_WALLET_NOT_FOUND));

        if (patientWallet.balance < consultationPrice)
            return next(new AppError("Insufficient balance", 400, errorCodes.BUSINESS_WALLET_INSUFFICIENT_FUNDS));

        // 🏦 خصم من المريض
        patientWallet.balance -= consultationPrice;
        await patientWallet.save({ session });

        // 🔢 توزيع المبلغ (مثلاً 20% للمنصة)
        const platformPercentage = 0.2;
        const platformShare = Math.round(consultationPrice * platformPercentage);
        const doctorShare = consultationPrice - platformShare;

        // 🧾 منصة - استخدم متغير بيئة
        const PLATFORM_EMAIL = "platform@yourapp.com";
        const platformUser = await User.findOne({ email: PLATFORM_EMAIL }).session(session);
        const platformWallet = await Wallet.findOne({ user: platformUser._id }).session(session);

        platformWallet.balance += platformShare;
        await platformWallet.save({ session });

        // 🧾 اضافة رصيد للطبيب
        let doctorWallet = await Wallet.findOne({ user: doctorAccount._id }).session(session);
        if (!doctorWallet) {
            doctorWallet = await Wallet.create([{ user: doctorAccount._id, balance: 0 }], { session });
            doctorWallet = doctorWallet[0];
        }

        doctorWallet.balance += doctorShare;
        await doctorWallet.save({ session });

        // 📝 إنشاء الاستشارة
        const consultation = await Consultation.create([{
            doctor: doctorAccount._id,
            patient: patientAccount._id,
            date: consultationDate,
            duration: durationMinutes,
            price: consultationPrice,
            type,
            notes
        }], { session });

        // 💸 تسجيل المعاملة للمريض
        await Transaction.create([{
            user: patientAccount._id,
            type: "consultation",
            amount: -consultationPrice,
            balanceAfter: patientWallet.balance,
            relatedConsultation: consultation[0]._id,
            note: `تم حجز استشارة مع د. ${doctorAccount.fullName?.first || "غير معروف"}`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // ✅ رد مع الأسماء
        res.status(201).json({
            status: "success",
            message: "Consultation booked successfully",
            data: {
                ...consultation[0].toObject(),
                doctor: {
                    _id: doctorAccount._id,
                    fullName: doctorAccount.fullName
                },
                patient: {
                    _id: patientAccount._id,
                    fullName: patientAccount.fullName
                }
            }
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
        return next(err instanceof AppError ? err : new AppError("Failed to create consultation", 500, errorCodes.BUSINESS_BOOKING_FAILED));
    }
});
