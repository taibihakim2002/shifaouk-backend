


const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Consultation = require("../models/consultationModel");
require("dotenv").config({})
const dataLocal = JSON.parse(fs.readFileSync(`./data/${process.argv[3] || "users"}.json`, "utf-8"));
const db = process.env.DB_STRING.replace("<DB_PASSWORD>", process.env.DB_PASSWORD)

mongoose.connect(db).then(con => {
    console.log("connected To Db 👌")

}).catch(err => {
    console.log(err.message)
})

const importData = async () => {
    try {
        switch (process.argv[3]) {
            case 'users':
                await User.insertMany(dataLocal);
                break;
            case 'consultations':
                await Consultation.insertMany(dataLocal);
                break;

            default:
                console.log("Select User Collection by Default")
                await User.insertMany(dataLocal);
                break;
        }
        console.log("Data imported successfuly")
    } catch (error) {
        console.log("Error When importing data", error)
    }
    process.exit(0)
}
const deleteData = async () => {
    try {
        switch (process.argv[3]) {
            case 'users':
                await User.deleteMany()
                break;
            case 'consultations':
                await Consultation.deleteMany()
                break;

            default:
                console.log("Select User Collection by Default")
                await User.deleteMany()
                break;
        }


        console.log("Data Deleted successfuly")


    } catch (error) {
        console.log("Error When importing data")

    }
    process.exit(0)
}


if (process.argv[2] === "import") {
    importData()

} else if (process.argv[2] === "delete") {
    deleteData()
}

