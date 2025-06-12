const express = require("express")
const { protect } = require("../controllers/authController");
const { getReportByConsultationId, doctorCreateAppointmentReport } = require("../controllers/ConsultationReportController");


const router = express.Router()


router.use(protect)
router.route("/:consultationId").post(doctorCreateAppointmentReport).get(getReportByConsultationId)


module.exports = router