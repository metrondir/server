const asyncHandler = require("express-async-handler");
const {
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

/**
 * @desc Register a user
 * @route POST /api/users/register
 * @access public
 * @param {string} username - The username of the user
 * @param {string} email - The email of the user
 * @param {string} password - The password of the user
 * @returns {string} To complete your registration, please check your email for activation instructions.
 */

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

/**
 * @desc Login a user
 * @route POST /api/users/login
 * @access public
 * @param {string} req.body.email - The email of the user
 * @param {string} req.body.password - The password of the user
 * @returns {Cookie} The refresh token and access token
 * @returns {Object} The user data
 */

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

/**
 * @desc logout a user
 * @route GET /api/users/logout
 * @access private
 * @param {Cookie} req.cookies.refreshToken - The refresh token of the user
 * @param {Cookie} req.cookies.accessToken - The access token of the user
 * @returns {Cookie} The refresh token and access token cleared
 * @returns {string}  - User logged out successfully
 */

const logoutUser = asyncHandler(async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = req.cookies.accessToken;
    await logout(refreshToken, accessToken);
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

/**
 * @desc refresh a access token
 * @route GET /api/users/refresh
 * @access public
 * @param {string} req.cookies.refreshToken - The refresh token of the user
 * @returns {Cookie} The refresh token and access token updated
 * @returns {Object} The user data
 */

const refreshTokenUser = asyncHandler(async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
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
    return res.status(200).json(userData.user);
  } catch (error) {
    next(error);
  }
});

/**
 * @desc activate a user
 * @route GET /api/users/activate/:link
 * @access public
 * @param {string} req.params.link - The activation link of the user
 * @returns {Cookie} The refresh token and access token set
 * @returns  redirect to client url
 */
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

/**
 * @desc change password of user
 * @route POST /api/users/change-password
 * @access public
 * @param {string} req.body.email - The email of the user
 * @param {string} req.body.password - The password of the user
 * @returns {string} Password changed successfully
 */
const changePasswordUser = asyncHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    await changePassword(email, password);
    return res.status(200).json("Password changed successfully");
  } catch (error) {
    next(error);
  }
});

/**
 * @desc forget password of user
 * @route POST /api/users/forget-password
 * @access public
 * @param {string} req.body.email - The email of the user
 * @returns {string} Forget password link has been sent to your email
 */
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

/**
 * @desc change passwordUser link
 * @route POST /api/users/forgot-password
 * @access public
 * @param {string} req.params.link - The link of the user
 * @returns redirect to client url/new-password
 */
const changePasswordUserLink = asyncHandler(async (req, res, next) => {
  try {
    const PasswordLink = req.params.link;
    await changePasswordLink(PasswordLink);
    return res.redirect(process.env.CLIENT_URL + "/new-password");
  } catch (error) {
    next(error);
  }
});

/**
 * @desc delete user
 * @route DELETE /api/users/delete-user
 * @access private
 * @param {string} req.user.id - The id of the user
 * @returns {string} User deleted successfully
 */
const deleteUserById = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    await deleteUser(userId);
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
  changePasswordUser,
  changePasswordUserLink,
  forgetPasswordUser,
  deleteUserById,
};
