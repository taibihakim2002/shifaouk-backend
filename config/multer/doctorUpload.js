// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");
// const AppError = require("../../utils/appError");

// const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const email = req.body.email;
//         if (!email) {
//             return cb(new AppError("Email is required to create doctor folder", 400, "E8"), null);
//         }

//         const folderName = email.replace(/[@.]/g, "_");
//         const uploadPath = path.join("uploads", "doctors", folderName);

//         if (!fs.existsSync(uploadPath)) {
//             fs.mkdirSync(uploadPath, { recursive: true });
//         }

//         cb(null, uploadPath);
//     },

//     filename: function (req, file, cb) {
//         const ext = path.extname(file.originalname);
//         const uniqueName = `${file.fieldname}-${Date.now()}${ext}`;
//         cb(null, uniqueName);
//     },
// });

// const fileFilter = (req, file, cb) => {
//     if (allowedMimeTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new AppError("Unsupported file type", 400), false);
//     }
// };

// const uploadDoctorFiles = multer({
//     storage,
//     fileFilter,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
// });

// module.exports = uploadDoctorFiles;
