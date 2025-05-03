const express = require("express")
const { getAllConsultations } = require("../controllers/consultationController")


const router = express.Router()

router.route("/").get(getAllConsultations)


module.exports = router