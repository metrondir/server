const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const uuid = require("uuid");
const moment = require("moment");
const EmailService = require("./gmailService");
const gmailService = new EmailService();
const Recipe = require("../models/recipeModel");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const {
  generateTokens,
  saveTokens,
  removeToken,
  validateRefreshToken,
  findToken,
} = require("./tokenService");
const UserDto = require("../dtos/userDtos");
const ApiError = require("../middleware/apiError");
const {
  redisGetModelsWithPaginating,
  redisGetModels,
  storeRegistrationDetails,
  getRegistrationDetailsByActivationLink,
  deleteRegistrationDetailsByActivationLink,
  setBlackListToken,
} = require("./redisService");

/**
 * @desc Validate the email uniqueness.
 * @param {string} email - The email to validate.
 * @returns {Promise} The email uniqueness validation.
 */
async function validateEmailUniqueness(email) {
  const candidate = await User.findOne({ email });
  if (candidate) {
    throw ApiError.BadRequest(
      `User with this email ${email} already registered`,
    );
  }
}

/**
 * @desc Create the user.
 * @param {string} username - The username to create.
 * @param {string} email - The email to create.
 * @param {string} hashedPassword - The hashed password to create.
 * @param {string} activationLink - The activation link to create.
 * @param {string} activationLinkExpiration - The activation link expiration to create.
 * @returns {Promise} The created user.
 */
async function createUser(
  username,
  email,
  hashedPassword,
  activationLink,
  activationLinkExpiration,
) {
  return await User.create({
    username,
    email,
    password: hashedPassword,
    activationLink,
    activationLinkExpiration,
  });
}

/**
 * @desc Create the link with time.
 * @returns {Promise} The expiration timestamp.
 */
async function createLinkWithTime() {
  const expirationDuration = 10;
  return moment().add(expirationDuration, "minutes").toISOString();
}

/**
 * @desc Send the activation email.
 * @param {string} to - The email to send to.
 * @param {string} link - The link to send.
 * @returns {Promise} The email sent result.
 */
async function sendActivationEmail(to, link) {
  await gmailService.sendActivationGmail(to, link);
}
/**
 * @desc Find user by refresh token.
 * @param {string} refreshToken - The refresh token to find user.
 * @returns {Object} The user found by refresh token.
 */
const findUserByRefreshToken = async (refreshToken) => {
  const tokenData = await findToken(refreshToken);
  return await User.findById(tokenData.user);
};

/**
 * @desc Register the user.
 * @param {string} username - The username to register.
 * @param {string} email - The email to register.
 * @param {string} password - The password to register.
 * @returns {Promise} The registration result.
 */
const registration = asyncHandler(async (username, email, password) => {
  await validateEmailUniqueness(email);

  const hashedPassword = await bcrypt.hash(password, 10);
  const activationLink = uuid.v4();

  const activationLinkExpiration = await createLinkWithTime();

  await storeRegistrationDetails(activationLink, {
    username,
    email,
    hashedPassword,
    activationLink,
    activationLinkExpiration,
  });
  return await sendActivationEmail(
    email,
    `${process.env.API_URL}/api/users/activate/${activationLink}`,
  );
});

/**
 * @desc Activate the user.
 * @param {string} activationLink - The activation link to activate.
 * @returns {Promise<Object>} The user data and tokens.
 */
const activate = asyncHandler(async (activationLink) => {
  try {
    const registrationDetails =
      await getRegistrationDetailsByActivationLink(activationLink);

    if (!registrationDetails) {
      throw ApiError.BadRequest("Incorrect activation link");
    }

    const currentTimestamp = moment();
    if (
      currentTimestamp.isAfter(registrationDetails.activationLinkExpiration)
    ) {
      const deprecatedActivationLink = registrationDetails.activationLink;
      const newActivationLink = uuid.v4();
      const newActivationLinkExpiration = moment()
        .add(10, "minutes")
        .toISOString();

      await storeRegistrationDetails(newActivationLink, {
        username: registrationDetails.username,
        email: registrationDetails.email,
        hashedPassword: registrationDetails.hashedPassword,
        activationLinkExpiration: newActivationLinkExpiration,
      });

      await sendActivationEmail(
        registrationDetails.email,
        `${process.env.CLIENT_URL}/api/users/activate/${newActivationLink}`,
      );
      await deleteRegistrationDetailsByActivationLink(deprecatedActivationLink);

      throw ApiError.BadRequest(
        "Activation link has expired. A new activation link has been sent to your email.",
      );
    }

    const user = await createUser(
      registrationDetails.username,
      registrationDetails.email,
      registrationDetails.hashedPassword,
      registrationDetails.activationLink,
      registrationDetails.activationLinkExpiration,
    );
    user.isActivated = true;
    user.activationLinkExpiration = undefined;
    await user.save();
    await deleteRegistrationDetailsByActivationLink(activationLink);
    const userDto = new UserDto(user);
    const tokens = generateTokens({ ...userDto });
    await saveTokens(userDto.id, tokens.refreshToken);
    return { ...tokens, user: userDto };
  } catch (error) {
    throw ApiError.BadRequest(error.message);
  }
});

/**
 * @desc Login the user.
 * @param {string} email - The email to login.
 * @param {string} password - The password to login.
 * @returns {Object} The userData and tokens.
 */
const login = asyncHandler(async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.BadRequest(`User with this email ${email} not found`);
  }
  if (!password) {
    throw ApiError.BadRequest("Password must be not empty");
  }
  const isPassEquals = await bcrypt.compare(password, user.password);
  if (!isPassEquals) {
    throw ApiError.BadRequest("Incorrect password");
  }
  const userDto = new UserDto(user);
  const tokens = generateTokens({ ...userDto });
  await saveTokens(userDto.id, tokens.refreshToken);

  return { ...tokens, user: userDto };
});

/**
 * @desc Logout the user.
 * @param {Object} req - The request object.
 * @returns {Promise} The logout result.
 */
const logout = asyncHandler(async (refreshToken, accessToken) => {
  try {
    await removeToken(refreshToken);
    return await setBlackListToken(accessToken);
  } catch (error) {
    console.log(error.message);
    throw ApiError.BadRequest("Something went wrong");
  }
});

/**
 * @desc Refresh the tokens.
 * @param {string} refreshToken - The refresh token to refresh.
 * @returns {Object} The tokens and user data
 */
const refresh = asyncHandler(async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.Forbbiden("User unauthenticated");
  }

  const userData = await validateRefreshToken(refreshToken);

  if (!userData) {
    throw ApiError.Forbbiden("User unauthenticated");
  }

  const user = await User.findById(userData.user);
  const userDto = new UserDto(user);
  const tokens = generateTokens({ ...userDto });

  await saveTokens(userDto.id, tokens.refreshToken);
  return { ...tokens, user: userDto };
});

/**
 * @desc Forget the password.
 * @param {string} email - The email to forget password.
 * @returns {string}  The change password link.
 */
const forgetPassword = asyncHandler(async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.BadRequest(`User with this email ${email} not found`);
  }

  if (!user.isActivated) {
    throw ApiError.BadRequest("User is not activated");
  }

  const changePasswordLink = uuid.v4();
  const changePasswordLinkExpiration = await createLinkWithTime();
  await gmailService.sendChangePasswordUser(
    email,
    `${process.env.CLIENT_URL}/api/users/change-password/${changePasswordLink}`,
  );
  user.changePasswordLink = changePasswordLink;
  user.isChangePasswordLink = false;
  user.changePasswordLinkExpiration = changePasswordLinkExpiration;
  await user.save();
  return changePasswordLink;
});

/**
 * @desc Change the password.
 * @param {string} email - The email to change password.
 * @param {string} password - The password to change.
 * @returns {Object} The user and tokens.
 */
const changePassword = asyncHandler(async (email, password) => {
  if (!password) {
    throw ApiError.BadRequest("Incorrect new password");
  }
  const user = await User.findOne({
    email,
    changePasswordLink: { $exists: true, $ne: null },
  });
  if (!user) {
    throw ApiError.BadRequest(`User doest not exsit or link has been expired`);
  }
  if (!user.isChangePasswordLink) {
    throw ApiError.BadRequest(`User not activate link for change password`);
  }
  if (email !== user.email) {
    throw ApiError.BadRequest(`User with this email ${email} not found`);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    throw ApiError.BadRequest(
      `New password cannot be the same as old password`,
    );
  }

  user.password = hashedPassword;
  user.changePasswordLink = undefined;
  user.isChangePasswordLink = undefined;
  user.changePasswordLinkExpiration = undefined;
  await user.save();
  const userDto = new UserDto(user);
  const tokens = generateTokens({ ...userDto });
  await saveTokens(userDto.id, tokens.refreshToken);

  return { ...tokens, user: userDto };
});

/**
 * @desc Change the password link.
 * @param {string} changePasswordLink - The change password link to change password.
 * @returns {Promise} The change password link result.
 */
const changePasswordLink = asyncHandler(async (changePasswordLink) => {
  const user = await User.findOne({ changePasswordLink: changePasswordLink });
  if (!user) {
    throw ApiError.BadRequest("Invalid change password link");
  }
  const currentTimestamp = moment();
  if (currentTimestamp.isAfter(user.changePasswordLinkExpiration)) {
    user.changePasswordLink = uuid.v4();
    user.changePasswordLinkExpiration = moment()
      .add(10, "minutes")
      .toISOString();
    await user.save();
    await sendActivationEmail(
      user.email,
      `${process.env.CLIENT_URL}/api/users/change-password/${user.changePasswordLink}`,
    );
    throw ApiError.BadRequest(
      "Activation link has expired. A new activation link has been sent to your email.",
    );
  }
  user.isChangePasswordLink = true;
  await user.save();
});

/**
 * @desc Delete the user by the id.
 * @param {string} userId - The id to delete.
 * @returns {Promise} The delete result.
 */
const deleteUser = asyncHandler(async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  await Recipe.deleteMany({ user: userId });
  await FavoriteRecipe.deleteMany({ user: userId });
  await FavoriteRecipe.updateMany(
    { user: { $in: userId } },
    { $inc: { aggregateLikes: -1 } },
  );
  await removeToken(user.refreshToken);
  if (!user) {
    throw ApiError.BadRequest("User not found");
  }
});

module.exports = {
  registration,
  activate,
  login,
  logout,
  forgetPassword,
  changePassword,
  changePasswordLink,
  deleteUser,
  findUserByRefreshToken,
  refresh,
};
