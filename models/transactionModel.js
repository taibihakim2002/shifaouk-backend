// models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["recharge", "payment", "consultation", "consultation_income", "consultation_refund", "refund", "payout"],
        required: true
    },
    amount: {
        type: Number,
        required: true

    },
    balanceAfter: {
        type: Number,
        required: true
    },
    relatedConsultation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consultation",
        required: function () {
            return this.type === "consultation";
        }
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "failed"],
        default: "confirmed"
    },
    paymentMethod: {
        type: String,
        enum: ["ccp", "visa", "wallet"],
        default: "wallet"
    },
    note: String,
}, {
    timestamps: true
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;