const express = require("express");
const { onlyFrontend, restrictTo, protect } = require("../controllers/authController");
const { getOverviewStats } = require("../controllers/dashboardController");
const router = express.Router();


router.use(protect)

router.route("/admin/home").get(restrictTo("admin"), onlyFrontend, getOverviewStats)

module.exports = router