const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/appError");

const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

const medicalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const patientId = req.body.patient || "unknown";
        return {
            folder: `appointment_records/${patientId}`,
            resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
            allowed_formats: ["jpg", "jpeg", "png", "pdf"],
            public_id: `${file.fieldname}-${Date.now()}`,
        };
    },
});

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError("نوع الملف غير مدعوم", 400), false);
    }
};

const uploadAppointmentFiles = multer({
    storage: medicalStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = uploadAppointmentFiles;
