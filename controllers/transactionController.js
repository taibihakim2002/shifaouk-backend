const Transaction = require("../models/transactionModel");
const catchAsync = require("../utils/catchAsync");

exports.getMyTransactions = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const transactions = await Transaction.find({ user: userId })
        .sort({ createdAt: -1 }) // ترتيب تنازلي بحسب وقت الإنشاء
        .populate("relatedConsultation") // إذا كنت تحتاج تفاصيل الاستشارة
        .exec();

    res.status(200).json({
        status: "success", results: transactions.length, data: transactions
    });
})