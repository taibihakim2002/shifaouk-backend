const Consultation = require("../models/consultationModel");
const APIFeatures = require("../utils/APIfeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");


exports.getAllConsultations = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Consultation.find(), req.query).filter().sort().limitFields().paginate();
    const consultations = await features.query.populate('doctorId', 'fullName').populate('patientId', 'fullName');
    res.status(200).json({ status: "success", results: consultations.length, data: consultations })
})


exports.createConsultations = catchAsync(async (req, res, next) => {
    const { doctorId, patientId, date, duration, price, type, notes } = req.body;

    // 1. التحقق من وجود الطبيب والمريض
    const doctor = await User.findById(doctorId);
    const patient = await User.findById(patientId);
    if (!doctor || doctor.role !== 'doctor') return next(new AppError("Doctor not found", 404));
    if (!patient || patient.role !== 'patient') return next(new AppError("Patient not found", 404));

    // 2. التأكد من أن التاريخ في المستقبل
    const consultationDate = new Date(date);
    if (consultationDate <= new Date()) return next(new AppError("Date must be in the future", 400));

    // 3. التحقق من توفر الطبيب في هذا اليوم والساعة
    const dayName = consultationDate.toLocaleString('en-US', { weekday: 'short' }).toLowerCase(); // ex: 'mon'
    const doctorAvailability = doctor.doctorProfile?.availability || [];

    const appointmentStart = consultationDate.toTimeString().slice(0, 5); // ex: '14:30'

    const foundSlot = doctorAvailability.find(slot => {
        return slot.day === dayName && appointmentStart >= slot.from && appointmentStart < slot.to;
    });

    if (!foundSlot) {
        return next(new AppError("Doctor is not available at this time", 400));
    }

    // 4. التحقق من عدم وجود تعارض مع مواعيد أخرى للطبيب
    const durationMinutes = parseInt(duration); // 15 أو 30
    const appointmentEnd = new Date(consultationDate.getTime() + durationMinutes * 60000);

    const overlapping = await Consultation.findOne({
        doctorId: doctorId,
        date: {
            $gte: new Date(consultationDate.getTime() - durationMinutes * 60000),
            $lt: new Date(appointmentEnd.getTime())
        },
        status: { $in: ["pending", "confirmed"] }
    });

    if (overlapping) {
        return next(new AppError("Doctor already has an appointment at this time", 400));
    }

    // 5. إنشاء الاستشارة
    const createdConsultation = await Consultation.create({
        doctorId,
        patientId,
        date,
        duration,
        price,
        type,
        notes
    });

    res.status(201).json({
        status: "success",
        message: "Consultation created successfully",
        data: createdConsultation
    });
});