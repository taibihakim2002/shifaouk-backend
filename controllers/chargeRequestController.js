const ChargeRequest = require("../models/ChargeRequestModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/APIfeatures");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const mongoose = require("mongoose");


exports.createChargeRequest = catchAsync(async (req, res, next) => {
    const {
        senderName,
        amount,
        transactionId,
        transferDate,
        notes,
    } = req.body;

    // التأكد من وجود الملف ورفعه إلى Cloudinary
    const receiptUrl = req.file?.path;
    if (!receiptUrl) {
        return next(new AppError("وصل الدفع مطلوب", 400));
    }

    // إنشاء الطلب
    const chargeRequest = await ChargeRequest.create({
        user: req.user._id,
        senderName,
        amount,
        transactionId,
        transferDate,
        receiptUrl,
        notes,
        status: "pending", // الحالة مبدئيًا معلقة
    });

    res.status(201).json({
        status: "success",
        message: "تم إرسال طلب الشحن بنجاح",
        data: chargeRequest,
    });
});


exports.getAllChargeRequests = catchAsync(async (req, res, next) => {
    const queryForAPIFeatures = { ...req.query };


    const mongoFilterConditions = {};

    // بحث نصي
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim() !== '') {
        const searchRegex = new RegExp(req.query.search.trim(), 'i');
        mongoFilterConditions.$or = [
            { "senderName": searchRegex },
            { "transactionId": searchRegex },
            { "notes": searchRegex },
        ];
        delete queryForAPIFeatures.search;
    }

    if (req.query.date) {
        const date = new Date(req.query.date); // ISO string قادم من React

        const start = new Date(date.setHours(0, 0, 0, 0));
        const end = new Date(date.setHours(23, 59, 59, 999));

        mongoFilterConditions.transferDate = { $gte: start, $lte: end };
        delete queryForAPIFeatures.date;
    }
    // فلترة حسب الحالة
    if (req.query.status) {
        mongoFilterConditions.status = req.query.status;
        delete queryForAPIFeatures.status;
    }

    const features = new APIFeatures(ChargeRequest.find(mongoFilterConditions), queryForAPIFeatures).filter().sort().limitFields().paginate();
    const chargeRequests = await features.query.populate('user')
    res.status(200).json({ status: "success", results: chargeRequests.length, data: chargeRequests })
});

exports.getChargeRequestById = catchAsync(async (req, res, next) => {
    const chargeRequest = await ChargeRequest.findById(req.params.id).populate("user")
    if (!chargeRequest) {
        return next(new AppError("Charge Request not found", 404))
    }
    res.status(200).json({ status: "Success", data: chargeRequest })
});

exports.approveChargeRequest = catchAsync(async (req, res, next) => {


    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        // 1. العثور على الطلب
        const chargeRequest = await ChargeRequest.findById(id).session(session);
        if (!chargeRequest) {
            throw new AppError("Charge Request not found", 404);
        }

        if (chargeRequest.status !== "pending") {
            throw new AppError("Charge Request has already been processed", 400);
        }

        // 2. تحديث حالة الطلب
        chargeRequest.status = "approved";
        await chargeRequest.save({ session });

        console.log(chargeRequest)

        // 3. تحديث أو إنشاء المحفظة
        let wallet = await Wallet.findOne({ user: chargeRequest.user }).session(session);

        console.log(wallet)
        if (!wallet) {
            return next(new AppError("Wallet Not Found"))
        } else {
            wallet.balance += chargeRequest.amount;
        }
        await wallet.save({ session });

        // 4. إنشاء المعاملة
        const transaction = await Transaction.create([{
            user: chargeRequest.user,
            type: "recharge",
            amount: chargeRequest.amount,
            balanceAfter: wallet.balance,
            status: "confirmed",
            paymentMethod: "ccp",
            note: `Recharge approved via CCP. Transaction ID: ${chargeRequest.transactionId}`
        }], { session });

        // 5. تأكيد العملية
        await session.commitTransaction();
        session.endSession();



        res.status(200).json({
            status: "success",
            message: "تم قبول الطلب، وتم شحن المحفظة وتسجيل المعاملة.",
            data: { chargeRequest, transaction: transaction[0] }
        });

    } catch (err) {
        // التراجع عن التغييرات
        await session.abortTransaction();
        session.endSession();
        next(err);
    }
});

exports.rejectChargeRequest = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body; // سبب الرفض (اختياري)

    const chargeRequest = await ChargeRequest.findById(id);
    if (!chargeRequest) {
        return next(new AppError("Charge Request not found", 404));
    }

    if (chargeRequest.status !== "pending") {
        return next(new AppError("Charge Request has already been processed", 400));
    }

    chargeRequest.status = "rejected";
    if (reason) chargeRequest.rejectionReason = reason;
    await chargeRequest.save();

    res.status(200).json({
        status: "success",
        message: "تم رفض طلب الشحن",
        data: chargeRequest
    });
});