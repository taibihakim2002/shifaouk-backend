const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/appError");

const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const email = req.body.email;
        if (!email) throw new AppError("Email is required", 400);

        const folderName = email.replace(/[@.]/g, "_");

        return {
            folder: `doctors/${folderName}`,
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

const uploadDoctorFiles = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = uploadDoctorFiles;
