const express = require("express")
const { getAllConsultations, createConsultations, getDoctorConsultations, getConsultationById, approveConsultation, rejectConsultation, getMyAppointments, getPatientNextAppointment, getDoctorNextAppointment } = require("../controllers/consultationController")
const { onlyFrontend, restrictTo, protect } = require("../controllers/authController")
const uploadAppointmentFiles = require("../middlewares/uploadAppointmentFiles")


const router = express.Router()


router.use(protect)

router.patch("/:consultationId/approve", restrictTo("doctor"), approveConsultation);
router.patch("/:consultationId/reject", restrictTo("doctor"), rejectConsultation);
router.route("/:id").get(restrictTo("patient", "doctor", "admin"), getConsultationById)
router
    .route("/")
    .get(restrictTo("admin", "doctor", "patient"), getAllConsultations)
    .post(
        restrictTo("admin", "doctor", "patient"),
        onlyFrontend,
        uploadAppointmentFiles.array("medicalRecords", 5), // اسم الحقل كما في الفورم
        createConsultations
    );
router.route("/patient/next-appointment").get(restrictTo("patient"), getPatientNextAppointment)
router.route("/doctor/next-appointment").get(restrictTo("doctor"), getDoctorNextAppointment)
router.route("/patient/my-appointment").get(restrictTo("patient"), getMyAppointments)

module.exports = router