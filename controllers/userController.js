const asyncHandler = require("express-async-handler");
const {
  getAllUsers,
  registration,
  activate,
  login,
  logout,
  refresh,
  changePassword,
  changePasswordLink,
  forgetPassword,
  deleteUser,
} = require("../services/userService");
const { validationResult } = require("express-validator");
const ApiError = require("../middleware/apiError");
//@desc Get all users
//@route GET /api/users/allusers
//@access private

const getUsers = asyncHandler(async (req, res, next) => {
  try {
    const users = await getAllUsers(req, res, next);
    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

//@desc Register a user
//@route POST /api/users/register
//@access public

const registerUser = asyncHandler(async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(ApiError.BadRequest("Validation error", errors.array()));
    }

    const { username, email, password } = req.body;
    await registration(username, email, password);

    return res
      .status(201)
      .json(
        "To complete your registration, please check your email for activation instructions.",
      );
  } catch (error) {
    throw ApiError.BadRequest(error);
  }
});

//@desc loginUser a user
//@route POST /api/users/login
//@access public

const loginUser = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userData = await login(email, password);
    res.cookie("refreshToken", userData.refreshToken, {
      maxAge: process.env.COOKIE_MAX_AGE,
      secure: true,
      sameSite: "None",
      httpOnly: true,
    });
    res.cookie("accessToken", userData.accessToken, {
      maxAge: process.env.COOKIE_MAX_AGE,
      secure: true,
      sameSite: "None",
      httpOnly: true,
    });
    return res.status(200).json(userData.user);
  } catch (error) {
    next(error);
  }
});

//@desc logoutUser a user
//@route POST /api/users/logout
//@access private with refreshtoken

const logoutUser = asyncHandler(async (req, res, next) => {
  try {
    await logout(req);
    res.clearCookie("refreshToken", {
      secure: true,
      httpOnly: true,
      sameSite: "None",
    });
    res.clearCookie("accessToken", {
      secure: true,
      httpOnly: true,
      sameSite: "None",
    });
    return res.status(200).json("User logged out successfully");
  } catch (error) {
    console.log(error);
    next(error);
  }
});

//@desc refreshToken from user
//@route GET /api/users/refresh
//@access private with refreshtoken

const refreshTokenUser = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    const userData = await refresh(refreshToken);
    res.cookie("refreshToken", userData.refreshToken, {
      maxAge: process.env.COOKIE_MAX_AGE,
      secure: true,
      httpOnly: true,
      sameSite: "None",
    });
    res.cookie("accessToken", userData.accessToken, {
      maxAge: process.env.COOKIE_MAX_AGE,
      secure: true,
      sameSite: "None",
      httpOnly: true,
    });
    return res.status(200).json(userData);
  } catch (error) {
    next(error);
  }
});

//@desc Activate a user
//@route POST /api/users/activate/:link
//@access private with activationLink

const activateUser = asyncHandler(async (req, res, next) => {
  try {
    const activationLink = req.params.link;
    const tokens = await activate(activationLink);
    res.cookie("refreshToken", tokens.refreshToken, {
      maxAge: process.env.COOKIE_MAX_AGE,
      secure: true,
      httpOnly: true,
      sameSite: "None",
    });
    res.cookie("accessToken", tokens.accessToken, {
      maxAge: process.env.COOKIE_MAX_AGE,
      secure: true,
      httpOnly: true,
      sameSite: "none",
    });
    res.redirect(process.env.CLIENT_URL);
  } catch (error) {
    next(error);
  }
});

//@desc Change password of user
//@route POST /api/users/change-password
//@access private with email and password

const changePasswordUser = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    await changePassword(email, password);
    return res.status(200).json("Password changed successfully");
  } catch (error) {
    next(error);
  }
});

//@desc Forget password of user
//@route POST /api/users/forgot-password
//@access public with email and password

const forgetPasswordUser = asyncHandler(async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(ApiError.BadRequest("Validation error", errors.array()));
    }

    const { email } = req.body;
    await forgetPassword(email);
    return res
      .status(200)
      .json("Forget password link has been sent to your email");
  } catch (error) {
    next(error);
  }
});

//@desc Confirm Link to change password of user
//@route POST /api/users/change-password/:link
//@access private with link

const changePasswordUserLink = asyncHandler(async (req, res, next) => {
  try {
    const PasswordLink = req.params.link;
    await changePasswordLink(PasswordLink);
    return res.redirect(process.env.CLIENT_URL + "/new-password");
  } catch (error) {
    next(error);
  }
});

//@desc Delete user by id
//@route DELETE /api/users/delete
//@access private with id
const deleteUserById = asyncHandler(async (req, res, next) => {
  try {
    await deleteUser(req.user.id);
    res.clearCookie("refreshToken", {
      secure: true,
      httpOnly: true,
      sameSite: "None",
    });
    res.clearCookie("accessToken", {
      secure: true,
      httpOnly: true,
      sameSite: "None",
    });
    return res.status(200).json("User deleted successfully");
  } catch (error) {
    next(error);
  }
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokenUser,
  activateUser,
  getUsers,
  changePasswordUser,
  changePasswordUserLink,
  forgetPasswordUser,
  deleteUserById,
};
