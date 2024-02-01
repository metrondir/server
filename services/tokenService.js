const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const tokenModel = require("../models/tokenModel");
const ApiError = require("../middleware/apiError");
function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15min",
  });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
}

function validateAccessToken(accessToken) {
  try {
    const userData = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    return userData;
  } catch (error) {
    throw ApiError.UnauthorizedError("Invalid access token");
  }
}
async function validateRefreshToken(refreshToken) {
  try {
    const tokenDocument = await findToken(refreshToken);
    return tokenDocument;
  } catch (error) {
    throw error;
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
