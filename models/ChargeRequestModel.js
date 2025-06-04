// models/ChargeRequest.js
const mongoose = require('mongoose');
const Counter = require('./counterModel');

const chargeRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: { type: String, required: true },
  chargeRequestId: {
    type: Number,
    unique: true,
    sparse: true
  },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true },
  transferDate: { type: Date, required: true },
  receiptUrl: { type: String, required: true }, // رابط الصورة بعد رفعها على cloud مثلا
  notes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  adminNote: String, // ملاحظات من الإدارة
  createdAt: { type: Date, default: Date.now },
});


chargeRequestSchema.pre("save", async function (next) {
  if (this.isNew && !this.chargeRequestId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: "chargeRequestId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.chargeRequestId = counter.seq;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const ChargeRequest = mongoose.model('ChargeRequest', chargeRequestSchema);
module.exports = ChargeRequest