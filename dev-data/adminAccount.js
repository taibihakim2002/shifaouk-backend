const { mongoose } = require("mongoose")
const User = require("../models/userModel")
require("dotenv").config({})


user = {
    "role": "admin",
    "fullName": {
        "first": "طيبي",
        "second": "عبد الحكيم"
    },
    "email": "hakim@taibi.com",
    "phone": "0655408680",
    "password": "20022002",
    "profileImage": "",
    "language": "ar",
    "adminProfile": {
        "permissions": ["manage_users", "manage_content"],
        "adminLevel": "super"
    },
    "lastLogin": "2023-05-10T09:00:00.000Z"
}
const db = process.env.DB_STRING.replace("<DB_PASSWORD>", process.env.DB_PASSWORD)

mongoose.connect(db).then(con => {
    console.log("connected To Db 👌")

}).catch(err => {
    console.log(err.message)
})

const adminAccount = async () => {
    try {
        const admin = await User.create(user);
        if (admin) {
            console.log("Added")
            process.exit(1)
        }
    } catch (error) {
        console.log(error)
    }

}

adminAccount()