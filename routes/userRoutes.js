const express = require("express")
const userController = require("../controllers/userController");
const { restrictTo, protect } = require("../controllers/authController");
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
// 
router.route("/patients").get(userController.getAllPatients)
router.route("/").get(restrictTo("admin"), userController.getAllUsers).post(restrictTo("admin"), userController.createUser)
router.route("/:id").get(restrictTo("admin"), userController.getUserById).delete(restrictTo("admin"), userController.deleteUser).patch(restrictTo(["admin"]), userController.updateUser)
router.route("/doctors/:id").patch(restrictTo("admin"), userController.updateDoctor)
router.patch("/update-availability/:doctorId", restrictTo("doctor", "admin"), userController.updateDoctorAvailability);

module.exports = router;