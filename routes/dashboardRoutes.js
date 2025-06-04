const express = require("express");
const { onlyFrontend, restrictTo, protect } = require("../controllers/authController");
const { getAdminOverviewStats, getAdminWalletStats } = require("../controllers/dashboardController");
const router = express.Router();


router.use(protect)

router.route("/admin/home").get(restrictTo("admin"), getAdminOverviewStats)
router.route("/admin/wallet").get(restrictTo("admin"), getAdminWalletStats)

module.exports = router