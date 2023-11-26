const express = require("express");
const { registerUser, currentUser, loginUser,logoutUser,refreshTokenUser,activateUser ,forgetPasswordUser,changePasswordUserLink,changePasswordUser, getUsers } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const {body} = require("express-validator");
const router = express.Router();


router.post("/register",
body("email").isEmail()
,body("password").isLength({min:7,max:50}), registerUser);

router.post("/login", loginUser);

router.post("/logout",logoutUser );

router.get("/activate/:link",activateUser );

router.post("/forget-password",forgetPasswordUser );

router.get("/change-password/:link",changePasswordUserLink);

router.post("/change-password",
body("newPassword").isLength({min:7,max:50}),changePasswordUser);

router.get("/refresh",refreshTokenUser );

router.get("/allusers",authMiddleware,getUsers)

module.exports = router;