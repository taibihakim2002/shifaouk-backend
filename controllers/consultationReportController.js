const { default: mongoose } = require("mongoose");
const Consultation = require("../models/consultationModel");
const ConsultationReport = require("../models/consultationRaportModel");
const Transaction = require("../models/transactionModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");



exports.doctorCreateAppointmentReport = catchAsync(async (req, res, next) => {
    const {
        summary,
        diagnosis,
        patientCondition,
        medications,
        recommendedTests,
        lifestyleAdvice,
        nextConsultationDate,
        finalConsultationStatus,
    } = req.body;

    const consultationId = req.params.consultationId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const consultation = await Consultation.findById(consultationId)
            .populate("doctor patient")
            .session(session);

        if (!consultation) {
            throw new AppError("الاستشارة غير موجودة", 404);
        }

        if (consultation.doctor._id.toString() !== req.user._id.toString()) {
            throw new AppError("غير مصرح لك بكتابة تقرير لهذه الاستشارة", 403);
        }

        const existingReport = await ConsultationReport.findOne({ consultation: consultationId }).session(session);
        if (existingReport) {
            throw new AppError("تم إنشاء تقرير لهذه الاستشارة من قبل", 400);
        }

        // 📝 إنشاء التقرير
        const report = await ConsultationReport.create(
            [{
                consultation: consultationId,
                patient: consultation.patient._id,
                doctor: req.user._id,
                summary,
                diagnosis,
                patientCondition,
                medications,
                recommendedTests,
                lifestyleAdvice,
                nextConsultationDate,
            }],
            { session }
        );

        // 🆕 تحديث حالة الاستشارة
        await Consultation.findByIdAndUpdate(
            consultationId,
            {
                status: finalConsultationStatus === "completed" ? "completed" : "cancelled",
            },
            { new: true, session }
        );

        // ✅ تحويل المال للطبيب إذا مكتملة
        if (finalConsultationStatus === "completed") {
            const doctorWallet = await Wallet.findOne({ user: req.user._id }).session(session);
            const platformUser = await User.findOne({ email: "platform@yourapp.com" }).session(session);
            const platformWallet = await Wallet.findOne({ user: platformUser._id }).session(session);

            const amount = consultation.doctorShare;

            if (!platformWallet || platformWallet.balance < amount) {
                throw new AppError("رصيد المنصة غير كافٍ لتحويل المبلغ للطبيب", 500);
            }

            // تحويل المبلغ
            platformWallet.balance -= amount;
            doctorWallet.balance += amount;
            await platformWallet.save({ session });
            await doctorWallet.save({ session });

            await Transaction.create(
                [{
                    user: platformUser._id,
                    type: "payout",
                    amount: -amount,
                    balanceAfter: platformWallet.balance,
                    relatedConsultation: consultation._id,
                    note: `تم تحويل ${amount} دج للطبيب ${consultation.doctor.fullName?.first}`,
                }],
                { session }
            );

            await Transaction.create(
                [{
                    user: req.user._id,
                    type: "consultation_income",
                    amount: amount,
                    balanceAfter: doctorWallet.balance,
                    relatedConsultation: consultation._id,
                    note: `ربح من استشارة مع ${consultation.patient.fullName?.first}`,
                }],
                { session }
            );
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: "success",
            data: report[0],
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
        return next(err instanceof AppError ? err : new AppError("فشل حفظ تقرير الاستشارة", 500));
    }
});



exports.getReportByConsultationId = catchAsync(async (req, res, next) => {
    const consultationId = req.params.consultationId;

    const report = await ConsultationReport.findOne({ consultation: consultationId }).populate("consultation").populate("patient").populate("doctor")

    if (!report) {
        return next(new AppError("لا يوجد تقرير استشارة", 500));
    }

    res.status(200).json({
        status: "success",
        data: report,
    });
});