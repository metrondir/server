const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokenUser,
  activateUser,
  forgetPasswordUser,
  changePasswordUserLink,
  changePasswordUser,
  getUsers,
  deleteUserById,
} = require("../controllers/userController");
const { googleOauthHandler } = require("../services/googleOauthService");
const authMiddleware = require("../middleware/authMiddleware");
const { body } = require("express-validator");

const router = express.Router();

router.post(
  "/register",
  body("email").isEmail(),
  body("password").isLength({ min: 7, max: 50 }),
  registerUser,
);

router.post("/login", loginUser);

router.get("/logout", logoutUser);

router.get("/activate/:link", activateUser);

router.post("/forget-password", forgetPasswordUser);

router.get("/change-password/:link", changePasswordUserLink);

router.post(
  "/change-password",
  body("password").isLength({ min: 7, max: 50 }),
  changePasswordUser,
);

router.get("/refresh", refreshTokenUser);

router.get("/allusers", authMiddleware, getUsers);

router.get("/sessions/oauth/google", googleOauthHandler);

router.delete("/delete-user", authMiddleware, deleteUserById);

module.exports = router;
