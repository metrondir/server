const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const tokenModel = require("../models/tokenModel");
const ApiError = require("../middleware/apiError");
const { checkBlackListToken } = require("./redisService");
const UserDto = require("../dtos/userDtos");
const User = require("../models/userModel");
const { uuidv7 } = require("uuidv7");

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

async function validateRefreshToken(refreshToken) {
  try {
    const tokenDocument = await findToken(refreshToken);
    return tokenDocument;
  } catch (error) {
    throw ApiError.BadRequest("Something went wrong");
  }
}

const saveTokens = asyncHandler(async (userId, refreshToken) => {
  const tokenData = await tokenModel.findOne({ user: userId });
  if (tokenData) {
    tokenData.refreshToken = refreshToken;
    return tokenData.save();
  }
  const token = await tokenModel.create({ user: userId, refreshToken });
  return token;
});
const removeToken = asyncHandler(async (refreshToken) => {
  const tokenData = await tokenModel.deleteOne({ refreshToken });
  return tokenData;
});
const findToken = asyncHandler(async (refreshToken) => {
  const tokenData = await tokenModel.findOne({ refreshToken });
  return tokenData;
});

module.exports = {
  generateTokens,
  saveTokens,
  removeToken,
  validateAccessToken,
  validateRefreshToken,
  findToken,
};
