
const express = require('express');
const { restrictTo, protect } = require('../controllers/authController');
const { getMyTransactions } = require('../controllers/transactionController');
const router = express.Router();

router.use(protect)
router.route("/my-transactions").get(restrictTo("patient", "admin"), getMyTransactions)

module.exports = router;