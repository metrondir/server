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
    default: "https://i.imgur.com/4jtCVcy.png"
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