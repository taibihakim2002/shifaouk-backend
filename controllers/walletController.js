const Wallet = require("../models/walletModel");

exports.getMyWalletBalance = async (req, res, next) => {
    const wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
        return res.status(404).json({ status: 'fail', message: 'لم يتم العثور على المحفظة' });
    }

    res.status(200).json({
        status: 'success',
        data: {
            balance: wallet.balance,
        },
    });
};