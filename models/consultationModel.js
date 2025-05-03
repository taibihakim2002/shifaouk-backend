const { default: mongoose } = require("mongoose")

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
    type: {
        type: String,
        enum: ["online", "in-persen"],
        default: "online"
    },
    duration: {
        type: String,
        enum: ["15min", "30min"],
        default: "15min"
    },
    date: {
        type: Date,
        required: [true, "The Date is required"]
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


const Consultation = mongoose.model("Consultation", consultationSchema)
module.exports = Consultation