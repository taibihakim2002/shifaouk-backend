const express = require("express")
const { getAllConsultations, createConsultations } = require("../controllers/consultationController")
const { onlyFrontend } = require("../controllers/authController")


const router = express.Router()

router.route("/").get(onlyFrontend, getAllConsultations).post(onlyFrontend, createConsultations)


module.exports = router