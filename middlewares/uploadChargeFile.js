const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/appError");

const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const userId = req.user?._id?.toString() || "unknown"; // تأكد من أن user متوفر من middleware auth

        return {
            folder: `wallet-charges/${userId}`,
            resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
            allowed_formats: ["jpg", "jpeg", "png", "pdf"],
            public_id: `receipt-${Date.now()}`,
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

const uploadChargeFile = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB فقط
});

module.exports = uploadChargeFile;
