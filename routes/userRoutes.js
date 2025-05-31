const express = require("express")
const userController = require("../controllers/userController");
const { restrictTo, protect } = require("../controllers/authController");
const router = express.Router();




router.route("/doctors").get(userController.getAllApprovedDoctors)
router.route("/top-doctors").get(userController.getTopDoctors)

router.use(protect)
// Doctors
router.route("/doctors/:requestId").get(restrictTo("admin"), userController.getdoctorByRequestId)
router.patch("/doctors/:doctorId/approve", restrictTo("admin"), userController.approveDoctor);
router.patch("/doctors/:doctorId/reject", restrictTo("admin"), userController.rejectDoctor);
router.route("/").get(restrictTo("admin"), userController.getAllUsers).post(restrictTo("admin"), userController.createUser)
router.route("/:id").get(restrictTo("admin"), userController.getUserById).delete(restrictTo("admin"), userController.deleteUser).patch(restrictTo(["admin"]), userController.updateUser)
router.patch("/update-availability/:doctorId", restrictTo("admin"), userController.updateDoctorAvailability);

module.exports = router;