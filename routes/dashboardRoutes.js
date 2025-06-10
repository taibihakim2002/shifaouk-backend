const express = require("express");
const { onlyFrontend, restrictTo, protect } = require("../controllers/authController");
const { getAdminOverviewStats, getAdminWalletStats, getDoctorHomeStats, getPatientHomeStats } = require("../controllers/dashboardController");
const router = express.Router();


router.use(protect)

router.route("/admin/home").get(restrictTo("admin"), getAdminOverviewStats)
router.route("/admin/wallet").get(restrictTo("admin"), getAdminWalletStats)
router.route("/doctor/home").get(restrictTo("doctor", "admin"), getDoctorHomeStats)
router.route("/patient/home").get(restrictTo("patient", "admin"), getPatientHomeStats)

module.exports = router