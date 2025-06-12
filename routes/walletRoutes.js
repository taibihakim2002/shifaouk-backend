
const express = require('express');
const { restrictTo, protect } = require('../controllers/authController');
const { getMyWalletBalance } = require('../controllers/walletController');
const router = express.Router();


router.get('/my-balance', protect, restrictTo('patient', 'doctor'), getMyWalletBalance);

module.exports = router;