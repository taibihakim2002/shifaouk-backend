
require("dotenv").config()
const mongoose = require("mongoose");


// This is the way to handle sync exception like referece error , and must be at top, we must start listening at top
process.on("uncaughtException", (err) => {
    console.log("💥 Uncaught Exception 💥 Shutting down...");
    console.log(err.name, err.message)
    process.exit(1)
})


const app = require("./app");

const db = process.env.DB_STRING.replace("<DB_PASSWORD>", process.env.DB_PASSWORD)


mongoose.connect(db).then(con => {
    console.log("connected To Db 👌")
}).catch(err => {
    console.log("Error when connecting db", err)
})


const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
    console.log(`I Am Listening To ${process.env.PORT}`)

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
