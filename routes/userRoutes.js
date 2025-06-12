const express = require("express")
const userController = require("../controllers/userController");
const { restrictTo, protect } = require("../controllers/authController");
const uploadPatientFiles = require("../middlewares/uploadPatientFiles");
const uploadDoctorFiles = require("../middlewares/updateDoctorFiles");
const router = express.Router();



router.route("/doctors/:id").get(userController.getdoctorById)
router.route("/doctors").get(userController.getAllApprovedDoctors)
router.route("/top-doctors").get(userController.getTopDoctors)

router.use(protect)
// Doctors
router.route("/doctors/:doctorId/available-slots").get(userController.getAvailableSlots)
router.route("/doctors/requests/:requestId").get(restrictTo("admin"), userController.getdoctorByRequestId)
router.patch("/doctors/:doctorId/approve", restrictTo("admin"), userController.approveDoctor);
router.patch("/doctors/:doctorId/reject", restrictTo("admin"), userController.rejectDoctor);
router.get("/doctors/:doctorId/patients", restrictTo("admin", "doctor"), userController.getDoctorPatients);
// Patients
router.route("/patients").get(userController.getAllPatients).patch(
    restrictTo("patient"),
    uploadPatientFiles.fields([
        { name: "profileImage", maxCount: 1 },
        { name: "files", maxCount: 10 }
    ]),
    userController.updatePatient
);
router.patch(
    "/doctors/profile",
    restrictTo("doctor"),
    uploadDoctorFiles.single("profileImage"),
    userController.updateDoctorProfile
);

router.route("/patients/:id").get(userController.getPatientById)
router.route("/patients/edit/:id").patch(restrictTo("admin"), userController.adminUpdatePatient)

router.route("/").get(restrictTo("admin"), userController.getAllUsers).post(restrictTo("admin"), userController.createUser)
router.route("/:id").get(restrictTo("admin"), userController.getUserById).delete(restrictTo("admin"), userController.deleteUser).patch(restrictTo(["admin"]), userController.updateUser)
router.route("/doctors/edit/:id").patch(restrictTo("admin"), userController.updateDoctor)
router.patch("/update-availability/:doctorId", restrictTo("doctor", "admin"), userController.updateDoctorAvailability);


router.post(
    "/patients/favorite-doctors/:doctorId",
    restrictTo("patient"),
    userController.toggleFavoriteDoctor
);
router.get("/patients/favorite-doctors", restrictTo("patient"), userController.getFavoriteDoctors);



module.exports = router;