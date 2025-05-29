const express = require("express");
const { onlyFrontend } = require("../controllers/authController");
const { getOverviewStats } = require("../controllers/dashboardController");
const router = express.Router();

router.route("/admin/home").get(onlyFrontend, getOverviewStats)

module.exports = router