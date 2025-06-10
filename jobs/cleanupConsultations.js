const cron = require("node-cron");
const Consultation = require("../models/consultationModel");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

cron.schedule("0 * * * *", async () => {
    console.log("🔄 Running cleanup job...");

    const expiredConsultations = await Consultation.find({
        status: "pending",
        date: { $lt: new Date() }
    });

    for (const consultation of expiredConsultations) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            consultation.status = "expired";
            await consultation.save({ session });

            // استرجاع المال
            const wallet = await Wallet.findOne({ user: consultation.patient }).session(session);
            wallet.balance += consultation.price;
            await wallet.save({ session });

            // تسجيل المعاملة
            await Transaction.create([{
                user: consultation.patient,
                type: "refund",
                amount: consultation.price,
                balanceAfter: wallet.balance,
                relatedConsultation: consultation._id,
                note: `استرجاع المبلغ بعد انتهاء موعد الاستشارة دون مراجعة الطبيب`
            }], { session });

            await session.commitTransaction();
            session.endSession();
            console.log(`✅ Expired consultation ${consultation._id} processed.`);

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            console.error(`❌ Failed to expire consultation ${consultation._id}`, err);
        }
    }
});
