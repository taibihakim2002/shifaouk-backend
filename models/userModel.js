const mongoose = require("mongoose");
const validator = require("validator")
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const Counter = require("./counterModel");
const availabilitySchema = new mongoose.Schema({
    day: { type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], required: true },
    from: { type: String, required: true, match: /^([0-1]\d|2[0-3]):([0-5]\d)$/ },
    to: { type: String, required: true, match: /^([0-1]\d|2[0-3]):([0-5]\d)$/ },
}, { _id: false });

const doctorProfileSchema = new mongoose.Schema({
    requestId: {
        type: Number,
        unique: true,
        sparse: true
    },
    specialization: { type: String, required: true },
    licenseDocuments: { type: [String], default: [] },
    experienceYears: { type: Number, min: 0 },
    languages: { type: [String], default: [] },
    consultationPrice: { type: Number, min: 0, default: 300 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    availability: { type: [availabilitySchema], default: [] },
    slotDurationInMinutes: {
        type: Number,
        min: 15,
        default: 30
    },
    bookingInstructions: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'suspended'],
        default: 'pending',
    },
    rejectionReason: { type: String, trim: true, default: '' },
    clinicAddress: String,
    workplace: String,
    doctorBio: String,
}, { _id: false });

const patientProfileSchema = new mongoose.Schema({
    birthDate: { type: Date },
    medicalHistory: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    chronicDiseases: { type: [String], default: [] },
    preferredLanguages: { type: [String], default: [] },
    uploadedFiles: { type: [String], default: [] },
    walletBalance: { type: Number, default: 0 },
    ccpNumber: { type: String }
}, { _id: false });

const adminProfileSchema = new mongoose.Schema({
    permissions: { type: [String], default: [] },
    adminLevel: { type: String, enum: ['super', 'moderator', 'support'], default: 'moderator' }
}, { _id: false });



const userSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["admin", "doctor", "patient"],
        required: [true, "Role is required!"]
    },
    fullName: {
        first: {
            type: String,
            minLength: [2, "First name must be at least 2 characters long"],
            maxLength: [20, "First name must not exceed 10 characters"],
            required: true
        },
        second: {
            type: String,
            minLength: [2, "Second name must be at least 2 characters long"],
            maxLength: [20, "Second name must not exceed 10 characters"],
            required: true
        },
    },
    email: {
        type: String,
        required: [true, "Email  is required!"],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Please Enter A Valid Email Adress"]
    },
    phone: {
        type: String,
        required: [true, "Phone Number is required!"],
        unique: true,
        validate: {
            validator: (value) => {
                return /^0[567][0-9]{8}$/.test(value)
            },
            message: `Please enter a valid Phone Number !`
        }
    },
    gender: {
        type: String,
        enum: ["ذكر", "انثى"],
        required: [true, "gender is required!"]
    },
    state: String,
    city: String,
    address: String,
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
    },
    profileImage: {
        type: String,
        default: ""
    },
    language: {
        type: String,
        default: 'ar'
    },
    doctorProfile: {
        type: doctorProfileSchema,
        default: null
    },
    patientProfile: {
        type: patientProfileSchema,
        default: null
    },
    adminProfile: {
        type: adminProfileSchema,
        default: null
    },
    lastLogin: {
        type: Date
    },
}, {
    timestamps: true
})



userSchema.pre("save", async function (next) {
    if (this.isNew && this.role === "doctor" && !this.doctorProfile?.requestId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { name: "doctorRequestId" },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.doctorProfile.requestId = counter.seq;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

userSchema.pre("save", function (next) {
    if (!this.isModified("role")) return;
    if (this.role === "admin") {
        this.patientProfile = null;
        this.doctorProfile = null;
    } else if (this.role === "doctor") {
        this.patientProfile = null;
        this.adminProfile = null;
    } else if (this.role === "patient") {
        this.doctorProfile = null;
        this.adminProfile = null;
    }

    next()
})

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const hashed = await bcrypt.hash(this.password, 10)
        this.password = hashed;
        next()
    } catch (error) {
        next(new AppError("Error When Hashing The Password", 404))
    }

})


userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

const User = mongoose.model("User", userSchema);
module.exports = User
