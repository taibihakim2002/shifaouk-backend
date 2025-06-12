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
exports.getMyAppointments = catchAsync(async (req, res, next) => {

    const queryForAPIFeatures = { ...req.query };
    const mongoFilterConditions = {
        patient: req.user._id, // 👈 الشرط المضاف لتصفية الاستشارات حسب المريض
    };
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
exports.getConsultationById = catchAsync(async (req, res, next) => {
    const { id } = req.params
    const consultation = await Consultation.findById(id).populate("patient")
    if (!consultation) {
        return next(new AppError("No Consultations found", 404))
    }
    res.status(200).json({ status: "success", data: consultation })
})

exports.approveConsultation = catchAsync(async (req, res, next) => {
    const { consultationId } = req.params;
    const doctorId = req.user.id; // تأكد أن middleware auth يضيف req.user

    const consultation = await Consultation.findById(consultationId);

    if (!consultation) {
        return res.status(404).json({ status: "fail", message: "consultation not found  " });
    }

    // تحقق من أن الطبيب هو نفسه الذي يملك الاستشارة
    if (consultation.doctor.toString() !== doctorId) {
        return res.status(403).json({ status: "fail", message: "غير مصرح لك بقبول هذه الاستشارة" });
    }

    // تحقق من الحالة
    if (consultation.status !== "pending") {
        return res.status(400).json({ status: "fail", message: "لا يمكن تعديل هذه الاستشارة لأنها ليست قيد الانتظار" });
    }

    consultation.status = "confirmed";
    await consultation.save();

    res.status(200).json({ status: "success", message: "تم تأكيد الاستشارة", data: consultation });
});
exports.rejectConsultation = catchAsync(async (req, res, next) => {
    const { consultationId } = req.params;
    const doctorId = req.user.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const consultation = await Consultation.findById(consultationId).session(session);
        if (!consultation) {
            await session.abortTransaction();
            return res.status(404).json({ status: "fail", message: "الاستشارة غير موجودة" });
        }

        if (consultation.doctor.toString() !== doctorId) {
            await session.abortTransaction();
            return res.status(403).json({ status: "fail", message: "غير مصرح لك بإلغاء هذه الاستشارة" });
        }

        if (consultation.status !== "pending") {
            await session.abortTransaction();
            return res.status(400).json({ status: "fail", message: "لا يمكن إلغاء هذه الاستشارة" });
        }

        // تحديث حالة الاستشارة
        consultation.status = "cancelled";
        await consultation.save({ session });

        // إرجاع المبلغ للمريض وخصمه من المنصة
        const patientWallet = await Wallet.findOne({ user: consultation.patient }).session(session);
        const PLATFORM_EMAIL = "platform@yourapp.com";
        const platformUser = await User.findOne({ email: PLATFORM_EMAIL }).session(session);
        const platformWallet = await Wallet.findOne({ user: platformUser._id }).session(session);

        if (!patientWallet || !platformWallet) {
            await session.abortTransaction();
            return res.status(500).json({ status: "fail", message: "حدث خطأ أثناء استرجاع الأموال" });
        }

        // تحويل المبلغ من المنصة للمريض
        const refundAmount = consultation.price;
        patientWallet.balance += refundAmount;
        platformWallet.balance -= refundAmount;

        await patientWallet.save({ session });
        await platformWallet.save({ session });

        // تسجيل المعاملة للمريض
        await Transaction.create([{
            user: consultation.patient,
            type: "refund",
            amount: refundAmount,
            balanceAfter: patientWallet.balance,
            relatedConsultation: consultation._id,
            note: "استرجاع مبلغ استشارة ملغاة"
        }], { session });

        // تسجيل المعاملة للمنصة
        await Transaction.create([{
            user: platformUser._id,
            type: "consultation_refund",
            amount: -refundAmount,
            balanceAfter: platformWallet.balance,
            relatedConsultation: consultation._id,
            note: "خصم مبلغ استشارة ملغاة"
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: "success",
            message: "تم إلغاء الاستشارة واسترجاع المبلغ",
            data: consultation
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
        return next(new AppError("فشل في إلغاء الاستشارة", 500));
    }
});






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
            doctor: doctorAccount._id,
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

        const medicalFiles = req.files?.map(file => ({
            url: file.path,
            public_id: file.filename,
            format: file.format,
        }));

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

        // 💰 كل المبلغ يذهب للمنصة
        platformWallet.balance += consultationPrice;
        await platformWallet.save({ session });




        // 📝 إنشاء الاستشارة مع doctorShare
        const consultation = await Consultation.create([{
            doctor: doctorAccount._id,
            patient: patientAccount._id,
            date: consultationDate,
            duration: durationMinutes,
            price: consultationPrice,
            doctorShare,
            type,
            notes,
            status: "pending",
            medicalFiles
        }], { session });

        await Transaction.create([{
            user: platformUser._id,
            type: "consultation_income",
            amount: consultationPrice,
            balanceAfter: platformWallet.balance,
            relatedConsultation: consultation[0]._id,
            note: `تحصيل مبلغ استشارة من المريض ${patientAccount.fullName?.first || "غير معروف"}`
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



exports.getPatientNextAppointment = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const now = new Date();

    const nextAppointment = await Consultation.findOne({
        patient: userId,
        status: { $in: ["confirmed"] }, // فقط المؤكدة
        $expr: {
            $gt: [
                { $add: ["$date", { $multiply: [{ $add: ["$duration", 5] }, 60000] }] },
                now
            ]
        }
    })
        .sort({ date: 1 })
        .populate("doctor");

    res.status(200).json({
        status: "success",
        data: nextAppointment,
    });
});
exports.getDoctorNextAppointment = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const now = new Date();

    const nextAppointment = await Consultation.findOne({
        doctor: userId,
        status: { $in: ["confirmed"] },
        $expr: {
            $gt: [
                { $add: ["$date", { $multiply: [{ $add: ["$duration", 5] }, 60000] }] },
                now
            ]
        }
    })
        .sort({ date: 1 })
        .populate("patient");

    res.status(200).json({
        status: "success",
        data: nextAppointment,
    });
});
