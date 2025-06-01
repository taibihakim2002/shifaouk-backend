const { default: mongoose } = require("mongoose");
const Consultation = require("../models/consultationModel");
const APIFeatures = require("../utils/APIfeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Transaction = require("../models/transactionModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");



exports.getAllConsultations = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Consultation.find(), req.query).filter().sort().limitFields().paginate();
    const consultations = await features.query.populate('doctor').populate('patient');
    res.status(200).json({ status: "success", results: consultations.length, data: consultations })
})
exports.createConsultations = catchAsync(async (req, res, next) => {
    const { doctor, patient, date, type, notes } = req.body; // تم حذف duration و price من body

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const doctorAccount = await User.findById(doctor).session(session);
        const patientAccount = await User.findById(patient).session(session);

        if (!doctorAccount || doctorAccount.role !== "doctor")
            return next(new AppError("Doctor not found", 404));

        if (!patientAccount || patientAccount.role !== "patient")
            return next(new AppError("Patient not found", 404));

        const consultationDate = new Date(date);
        if (consultationDate <= new Date())
            return next(new AppError("Date must be in the future", 400));

        const dayName = consultationDate.toLocaleString("en-US", { weekday: "short" }).toLowerCase();
        const doctorAvailability = doctorAccount.doctorProfile?.availability || [];

        const appointmentStart = consultationDate.toTimeString().slice(0, 5); // "14:30"
        const foundSlot = doctorAvailability.find(slot =>
            slot.day === dayName && appointmentStart >= slot.from && appointmentStart < slot.to
        );
        if (!foundSlot)
            return next(new AppError("Doctor is not available at this time", 400));

        // 🕒 جلب المدة من ملف الطبيب
        const durationMinutes = doctorAccount.doctorProfile.slotDurationInMinutes;

        const appointmentEnd = new Date(consultationDate.getTime() + durationMinutes * 60000);

        const overlapping = await Consultation.findOne({
            doctorId: doctorAccount._id,
            date: {
                $gte: new Date(consultationDate.getTime() - durationMinutes * 60000),
                $lt: new Date(appointmentEnd.getTime())
            },
            status: { $in: ["pending", "confirmed"] }
        }).session(session);

        if (overlapping)
            return next(new AppError("Doctor already has an appointment at this time", 400));

        // 💵 جلب السعر الحقيقي من ملف الطبيب
        const consultationPrice = doctorAccount.doctorProfile.consultationPrice;

        const patientWallet = await Wallet.findOne({ user: patientAccount._id }).session(session);
        if (!patientWallet)
            return next(new AppError("Wallet not found", 404));

        if (patientWallet.balance < consultationPrice)
            return next(new AppError("Insufficient wallet balance", 400));

        // 🏦 خصم الرصيد من المحفظة
        patientWallet.balance -= consultationPrice;
        await patientWallet.save({ session });


        const consultation = {
            doctor: doctorAccount._id,
            patient: patientAccount._id,
            date: consultationDate,
            duration: durationMinutes,
            price: consultationPrice,
            type,
            notes
        }

        // 📝 إنشاء الاستشارة
        const createdConsultation = await Consultation.create([consultation], { session });
        console.log(createdConsultation)
        // 💸 تسجيل المعاملة
        await Transaction.create([{
            user: patientAccount._id,
            type: "consultation",
            amount: -consultationPrice,
            balanceAfter: patientWallet.balance,
            relatedConsultation: createdConsultation[0]._id,
            note: `Consultation booked with Dr. ${doctorAccount.fullName?.first || "Unknown"}`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            status: "success",
            message: "Consultation booked successfully",
            data: createdConsultation[0]
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.log(err)
        return next(err instanceof AppError ? err : new AppError("Failed to create consultation", 500));
    }
});
