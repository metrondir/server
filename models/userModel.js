const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    username:{
        type: String,
        required: [true , "Please add the user name"],
   },
   email:{
    type: String,
    required: [true, "Please add the user email adress"],
    unique: [true, "Email address already taken"],
   },
   password: {
    type: String,
    required: [true, "Please add the user password"]
   },
   isActivated: {
    type: Boolean,
    default: false,
   },
   picture:{
    type: String,
    required: [false, "Please add the user picture"],
    default: "https://res.cloudinary.com/dx4wkpab8/image/upload/v1621546506/avatars/avatar-1_kkq1wz.png"
   },
    activationLink: {
     type: String,
     required: [true, "Please add the user activation link"]
    },
    isChangePasswordLink: {
        type: Boolean,
        default: false,
    },
    changePasswordLink: {
        type: String,
        required: [false, "Please add the user change password link"]
    },
},
{
    timestamps: true,
}
);

module.exports = mongoose.model("User", userSchema);