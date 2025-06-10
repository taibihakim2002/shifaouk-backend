const { default: mongoose } = require("mongoose");
const Counter = require("./counterModel");

const consultationSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Doctor Id Is Required"]
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Patient Id is required"]
    },
    consultationId: {
        type: Number,
        unique: true,
        sparse: true
    },
    type: {
        type: String,
        enum: ["online"],
        default: "online"
    },
    duration: {
        type: Number, // مثلًا: 15 أو 30
        enum: [15, 30, 45, 60],
        default: 15
    },
    date: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return value > new Date();
            },
            message: "Date must be in the future."
        }
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "completed", "expired"],
        default: "pending",
    },
    doctorShare: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: [true, "The price is required"]
    },
    meetingLink: {
        type: String,
        default: null,
        match: [/^https?:\/\/.+/, "Meeting link must be a valid URL"]
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    transactionRef: {
        type: String,
        default: null
    },
    medicalFiles: [
        {
            url: String,
            public_id: String,
            format: String
        }
    ],

}, {
    timestamps: true
})


consultationSchema.pre("save", async function (next) {
    if (this.isNew && !this.consultationId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { name: "consultationId" },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.consultationId = counter.seq;
        } catch (err) {
            return next(err);
        }
    }
    next();
});


const Consultation = mongoose.model("Consultation", consultationSchema)
module.exports = Consultation