
require("dotenv").config()
require("./jobs/cleanupConsultations");

const mongoose = require("mongoose");


// This is the way to handle sync exception like referece error , and must be at top, we must start listening at top
process.on("uncaughtException", (err) => {
    console.log("💥 Uncaught Exception 💥 Shutting down...");
    console.log(err.name, err.message)
    process.exit(1)
})


const app = require("./app");
const User = require("./models/userModel");
const Wallet = require("./models/walletModel");



const db = process.env.DB_STRING.replace("<DB_PASSWORD>", process.env.DB_PASSWORD)


mongoose.connect(db).then(con => {
    console.log("connected To Db 👌")
}).catch(err => {
    console.log("Error when connecting db", err)
})


const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
    console.log(`I Am Listening To ${process.env.PORT}`)
    // ensurePlatformAccount().catch(console.error);

})

// This is the way to handle async rejections (promise rejections like data pase connection error)
process.on("unhandledRejection", (err) => {
    console.log(err.name, err.message)
    console.log("💥 UNHANDLED REJECTION 💥 Shutting down...");
    // Gracefully shut down the server
    server.close(() => {
        process.exit(1)
    })

})



// async function ensurePlatformAccount() {
//     const PLATFORM_EMAIL = "platform@yourapp.com";

//     // تحقق مما إذا كان الحساب موجودًا
//     let platformUser = await User.findOne({ email: PLATFORM_EMAIL });

//     if (!platformUser) {
//         console.log("🔧 Creating platform account...");
//         platformUser = await User.create({
//             email: PLATFORM_EMAIL,
//             gender: "ذكر",
//             phone: "0500000000",
//             password: "SecureRandomPassword123!", // اجعلها قوية ولا تسمح بالدخول بها
//             role: "platform",
//             fullName: { first: "Platform", second: "Account" },

//         });
//     }

//     // تحقق من وجود المحفظة
//     const existingWallet = await Wallet.findOne({ user: platformUser._id });
//     if (!existingWallet) {
//         console.log("💰 Creating wallet for platform...");
//         await Wallet.create({
//             user: platformUser._id,
//             balance: 0
//         });
//     }

//     console.log("✅ Platform account ready.");
// }

// // 👇 استدع هذا بعد الاتصال بقاعدة البيانات
// ensurePlatformAccount().catch(console.error);