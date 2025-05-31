const { default: mongoose } = require("mongoose");
const Counter = require("./counterModel");

const consultationSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Doctor Id Is Required"]
    },
    patientId: {
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
        enum: ["online", "in-persen"],
        default: "online"
    },
    duration: {
        type: Number, // مثلًا: 15 أو 30
        enum: [15, 30],
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
        enum: ["pending", "confirmed", "cancelled", "completed"],
        default: "pending",
    },
    price: {
        type: Number,
        required: [true, "The price is required"]
    },
    meetingLink: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        maxlength: 1000
    },
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