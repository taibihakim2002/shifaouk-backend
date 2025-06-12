const cron = require("node-cron");
const Consultation = require("../models/consultationModel");
const Wallet = require("../models/walletModel");
const Transaction = require("../models/transactionModel");
const mongoose = require("mongoose");

// تشغيل كل دقيقة
cron.schedule("0 * * * *", async () => {
    console.log("🔄 Checking consultations created more than 5 hours ago...");

    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000); // الآن - 5 ساعات

    const expiredConsultations = await Consultation.find({
        status: "pending",
        createdAt: { $lt: fiveHoursAgo }
    });


    for (const consultation of expiredConsultations) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // تحديث حالة الاستشارة
            await Consultation.updateOne(
                { _id: consultation._id },
                { $set: { status: "rejected" } },
                { session }
            );


            // استرجاع المال للمريض
            const wallet = await Wallet.findOne({ user: consultation.patient }).session(session);
            const newBalance = wallet.balance + consultation.price;

            await Wallet.updateOne(
                { _id: wallet._id },
                { $set: { balance: newBalance } },
                { session }
            );

            // تسجيل المعاملة المالية
            await Transaction.create([{
                user: consultation.patient,
                type: "refund",
                amount: consultation.price,
                balanceAfter: newBalance,
                relatedConsultation: consultation._id,
                note: `تم رفض الاستشارة تلقائيًا بعد مرور 5 ساعات دون مراجعة الطبيب`
            }], { session });

            await session.commitTransaction();
            session.endSession();
            console.log(`✅ Rejected consultation ${consultation._id} and refunded successfully.`);

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            console.error(`❌ Error processing consultation ${consultation._id}`, err);
        }
    }
});
