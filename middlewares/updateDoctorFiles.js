const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/appError");

const allowedMimeTypes = ["image/jpeg", "image/png"];

const doctorStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const userId = req.user?.id || "unknown";
        return {
            folder: `doctors/${userId}`,
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png"],
            public_id: `${file.fieldname}-${Date.now()}`
        };
    }
});

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError("نوع الملف غير مدعوم للطبيب", 400), false);
    }
};

const uploadDoctorFiles = multer({
    storage: doctorStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = uploadDoctorFiles;
