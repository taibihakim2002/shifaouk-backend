const express = require("express");
const { login, registerPatient, registerDoctor, logout, onlyFrontend, registerAdmin, protect } = require("../controllers/authController");
const uploadDoctorFiles = require("../config/multer/doctorUpload");

const router = express.Router();



router.post("/login", onlyFrontend, login)
router.post("/register/patient", onlyFrontend, registerPatient)
router.post(
    "/register/doctor",
    onlyFrontend,

    uploadDoctorFiles.fields([
        { name: "profile", maxCount: 1 },
        { name: "bac", maxCount: 1 },
        { name: "specCar", maxCount: 1 },
        { name: "profession", maxCount: 1 },
    ]),
    registerDoctor
);

router.post("/register/admin", onlyFrontend, registerAdmin)

router.use(protect)


router.post("/logout", onlyFrontend, logout)


module.exports = router;