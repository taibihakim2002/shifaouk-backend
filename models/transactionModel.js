// models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["recharge", "payment"],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "failed"],
        default: "pending"
    },
    consultationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consultation",
        required: function () {
            return this.type === "payment";
        }
    },
    paymentMethod: {
        type: String,
        enum: ["ccp", "visa", "wallet"],
        default: "ccp"
    },
    note: String,
}, {
    timestamps: true
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
