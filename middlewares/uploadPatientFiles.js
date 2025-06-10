// middleware/uploadPatientFiles.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/appError");

const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

const patientStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const userId = req.user?.id || "unknown";
        return {
            folder: `patients/${userId}`,
            resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
            allowed_formats: ["jpg", "jpeg", "png", "pdf"],
            public_id: `${file.fieldname}-${Date.now()}`
        };
    }
});

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError("نوع الملف غير مدعوم", 400), false);
    }
};

const uploadPatientFiles = multer({
    storage: patientStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = uploadPatientFiles;
