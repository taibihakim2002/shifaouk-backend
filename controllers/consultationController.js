const Consultation = require("../models/consultationModel");
const APIFeatures = require("../utils/APIfeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");


exports.getAllConsultations = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Consultation.find(), req.query).filter().sort().limitFields().paginate();
    const consultations = await features.query
    res.status(200).json({ status: "success", results: consultations.length, data: consultations })
})

exports.createConsultations = catchAsync(async (req, res, next) => {

    const createdConsultation = await Consultation.create(req.body, { new: true });
    if (!createdConsultation) {
        return new AppError("Error When Creaet")
    }
})