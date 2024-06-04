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
} = require("../middleware/paginateMiddleware");

async function validateEmailUniqueness(email) {
  const candidate = await User.findOne({ email });
  if (candidate) {
    throw ApiError.BadRequest(
      `User with this email ${email} already registered`,
    );
  }
}

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

async function createLinkWithTime() {
  const expirationDuration = 10;
  const expirationTimestamp = moment()
    .add(expirationDuration, "minutes")
    .toISOString();

  return expirationTimestamp;
}

async function sendActivationEmail(to, link) {
  await gmailService.sendActivationGmail(to, link);
}
const findUserByRefreshToken = async (refreshToken) => {
  const tokenData = await findToken(refreshToken);

  const user = await User.findById(tokenData.user);
  return user;
};

const getAllUsers = asyncHandler(async (req, res, next) => {
  if (req.query.page && req.query.limit) {
    await redisGetModelsWithPaginating(User, req, res, next);
  } else {
    await redisGetModels(User, req, res, next);
  }
});

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
  await sendActivationEmail(
    email,
    `${process.env.API_URL}/api/users/activate/${activationLink}`,
  );

  return "To complete your registration, please check your email for activation instructions.";
});

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

const logout = asyncHandler(async (refreshToken) => {
  const token = await removeToken(refreshToken);
  return token;
});

const refresh = asyncHandler(async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.Forbbiden("User unauthenticated");
  }

  const userData = await validateRefreshToken(refreshToken);
  const tokenFromDb = await findToken(refreshToken);

  if (!userData || !tokenFromDb) {
    throw ApiError.Forbbiden("User unauthenticated");
  }

  const user = await User.findById(tokenFromDb.user);
  const userDto = new UserDto(user);
  const tokens = generateTokens({ ...userDto });

  await saveTokens(userDto.id, tokens.refreshToken);
  return { ...tokens, user: userDto };
});

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

const deleteUser = asyncHandler(async (id) => {
  const user = await User.findByIdAndDelete(id);
  await Recipe.deleteMany({ user: id });
  await FavoriteRecipe.deleteMany({ user: id });
  await FavoriteRecipe.updateMany(
    { user: { $in: id } },
    { $inc: { aggregateLikes: -1 } },
  );
  await removeToken(user.refreshToken);
  if (!user) {
    throw ApiError.BadRequest("User not found");
  }
});

module.exports = {
  getAllUsers,
  registration,
  activate,
  login,
  logout,
  refresh,
  forgetPassword,
  changePassword,
  changePasswordLink,
  deleteUser,
  findUserByRefreshToken,
};
