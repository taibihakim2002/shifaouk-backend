const express = require("express")
const { restrictTo, protect } = require("../controllers/authController")
const { createChargeRequest, getAllChargeRequests, getChargeRequestById, approveChargeRequest, rejectChargeRequest } = require("../controllers/chargeRequestController")
const uploadChargeFile = require("../middlewares/uploadChargeFile")

const router = express.Router()

router.use(protect)

router
    .route("/")
    .post(
        restrictTo("patient", "admin"),
        uploadChargeFile.single("receipt"),
        createChargeRequest
    );
router.route("/").get(restrictTo("patient", "admin"), getAllChargeRequests)
router.route("/:id").get(restrictTo("patient", "admin"), getChargeRequestById)
router.route("/:id/approve").post(restrictTo("patient", "admin"), approveChargeRequest)
router.route("/:id/reject").post(restrictTo("patient", "admin"), rejectChargeRequest)

module.exports = router