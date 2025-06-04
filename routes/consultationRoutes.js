const express = require("express")
const { getAllConsultations, createConsultations, getDoctorConsultations } = require("../controllers/consultationController")
const { onlyFrontend, restrictTo, protect } = require("../controllers/authController")


const router = express.Router()


router.use(protect)

router.route("/").get(restrictTo("admin", "doctor", "patient"), getAllConsultations).post(restrictTo("admin", "doctor", "patient"), onlyFrontend, createConsultations)

module.exports = router