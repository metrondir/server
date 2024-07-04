const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const tokenModel = require("../models/tokenModel");
const ApiError = require("../middleware/apiError");
const { checkBlackListToken } = require("./redisService");
const UserDto = require("../dtos/userDtos");
const User = require("../models/userModel");
const { uuidv7 } = require("uuidv7");

/**
 * @desc Generate the tokens.
 * @param {Object} payload - The payload to generate the tokens.
 * @returns {Object} The accessTokens and the refresh token.
 */
function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME,
  });
  const refreshToken = jwt.sign(
    { id: uuidv7() },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME,
    },
  );

  return { accessToken, refreshToken };
}

/**
 * @desc Validate the access token.
 * @param {string} accessToken - The access token to validate.
 * @param {string} refreshToken - The refresh token to validate.
 * @returns {Object} The user data and the tokens.
 */
async function validateAccessToken(accessToken, refreshToken) {
  if ((await checkBlackListToken(accessToken)) === true) {
    throw ApiError.UnauthorizedError("User unauthorized");
  }
  let userData = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, {
    ignoreExpiration: true,
  });
  const decodedData = jwt.decode(accessToken);
  if (decodedData.exp * 1000 <= new Date().getTime()) {
    const valiadtionRefresh = await validateRefreshToken(refreshToken);
    if (!valiadtionRefresh) {
      throw ApiError.UnauthorizedError("User unauthorized");
    }
    const user = await User.findById(valiadtionRefresh.user);
    if (!user) {
      throw ApiError.UnauthorizedError("User unauthorized");
    }
    userData = new UserDto(user);
    const tokens = generateTokens({ ...userData });
    await saveTokens(userData.id, tokens.refreshToken);

    return { userData, tokens };
  }
  return { userData, tokens: null };
}

/**
 * @desc Validate the refresh token.
 * @param {string} refreshToken - The refresh token to validate.
 * @returns {Object} The refreshToken.
 */
async function validateRefreshToken(refreshToken) {
  return await findToken(refreshToken);
}

/**
 * @desc Save the token.
 * @param {string} userId - The id of the user.
 * @param {string} refreshToken - The refresh token.
 * @returns {Promise} The result of the query.
 */
const saveTokens = asyncHandler(async (userId, refreshToken) => {
  return await tokenModel.create({ user: userId, refreshToken });
});

/**
 * @desc Remove the token.
 * @param {string} refreshToken - The refresh token.
 * @returns {Promise} The result of the query.
 */
const removeToken = asyncHandler(async (refreshToken) => {
  return await tokenModel.deleteOne({ refreshToken });
});

/**
 * @desc Find the token.
 * @param {string} refreshToken - The refresh token.
 * @returns {Promise} The result of the query.
 */
const findToken = asyncHandler(async (refreshToken) => {
  return await tokenModel.findOne({ refreshToken });
});

module.exports = {
  generateTokens,
  saveTokens,
  removeToken,
  validateAccessToken,
  validateRefreshToken,
  findToken,
};
