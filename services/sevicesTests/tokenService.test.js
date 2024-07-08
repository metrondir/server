const jwt = require("jsonwebtoken");
const redis = require("../../config/redisClient");
const ApiError = require("../../middleware/apiError");
const {
  generateTokens,
  validateAccessToken,
  validateRefreshToken,
  removeToken,
  findToken,
  saveTokens,
} = require("../tokenService");
const User = require("../../models/userModel");
const tokenModel = require("../../models/tokenModel");
const { uuidv7 } = require("uuidv7");
jest.mock("../../models/tokenModel");

jest.mock("../../config/redisClient");
test("generateTokens should return the access and refresh tokens", async () => {
  const payload = { id: "123", email: "dahou22@gmail.com", role: "admin" };
  const { accessToken, refreshToken } = generateTokens(payload);

  expect(accessToken).toBeTruthy();
  expect(refreshToken).toBeTruthy();
});

test("validateAccessToken should return the user data and the tokens", async () => {
  const accessToken = jwt.sign(
    { _id: "66899a02cedcd3939b0cced7", email: "dahou22@gmail.com" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME },
  );
  const refreshToken = jwt.sign(
    { _id: uuidv7() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME },
  );
  const user = new User({
    _id: "66899a02cedcd3939b0cced7",
    email: "dahou22@gmail.com",
  });

  const token = new tokenModel({
    user: user._id,
    refreshToken: refreshToken,
  });
  token.save = jest.fn();
  tokenModel.findOne = jest.fn().mockResolvedValue(token);
  User.findById = jest.fn().mockResolvedValue(user);

  jwt.verify = jest.fn().mockReturnValue({
    id: user._id,
    email: user.email,
  });
  jwt.decode = jest.fn().mockReturnValue({
    exp: new Date().getTime() + 1000,
  });

  const result = await validateAccessToken(accessToken, refreshToken);

  // Assertions
  expect(result.userData.id).toEqual(user._id);
  expect(result.userData.email).toEqual(user.email);
  expect(result.tokens).toBeNull();
});
test("validateAccessToken should return the user data and new tokens", async () => {
  const accessToken = jwt.sign(
    { _id: "66899a02cedcd3939b0cced7", email: "dahou22@gmail.com" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME },
  );
  const refreshToken = jwt.sign(
    { _id: uuidv7() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME },
  );
  const user = new User({
    _id: "66899a02cedcd3939b0cced7",
    email: "dahou22@gmail.com",
  });

  const token = new tokenModel({
    user: user._id,
    refreshToken: refreshToken,
  });
  token.save = jest.fn();
  tokenModel.findOne = jest.fn().mockResolvedValue(token);
  User.findById = jest.fn().mockResolvedValue(user);

  jwt.verify = jest.fn().mockReturnValue({
    id: user._id,
    email: user.email,
  });
  jwt.decode = jest.fn().mockReturnValue({
    exp: new Date().getTime() - Date.now() + 1000,
  });

  const result = await validateAccessToken(accessToken, refreshToken);
  // Assertions
  expect(result.userData.id).toEqual(user._id);
  expect(result.userData.email).toEqual(user.email);
  expect(result.tokens.accessToken).toBeTruthy();
  expect(result.tokens.refreshToken).toBeTruthy();
  expect(result.tokens.accessToken).not.toEqual(accessToken);
  expect(result.tokens.refreshToken).not.toEqual(refreshToken);
});

test("validateAccessToken should throw UnauthorizedError for not existed refreshToken", async () => {
  const accessToken = jwt.sign(
    { _id: "66899a02cedcd3939b0cced7", email: "dahou22@gmail.com" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME },
  );
  const refreshToken = jwt.sign(
    { _id: uuidv7() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME },
  );
  const user = new User({
    _id: "66899a02cedcd3939b0cced7",
    email: "dahou22@gmail.com",
  });

  const token = new tokenModel({
    user: user._id,
    refreshToken: refreshToken,
  });
  token.save = jest.fn();
  tokenModel.findOne = jest.fn().mockResolvedValue(false);

  jwt.verify = jest.fn().mockReturnValue({
    id: user._id,
    email: user.email,
  });
  jwt.decode = jest.fn().mockReturnValue({
    exp: new Date().getTime() - Date.now() + 1000,
  });

  await expect(() =>
    validateAccessToken(accessToken, refreshToken),
  ).rejects.toThrowError(ApiError.UnauthorizedError("User unauthorized"));
});

test("validateAccessToken should throw UnauthorizedError for not existed user", async () => {
  const accessToken = jwt.sign(
    { _id: "66899a02cedcd3939b0cced7", email: "dahou22@gmail.com" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME },
  );
  const refreshToken = jwt.sign(
    { _id: uuidv7() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME },
  );
  const user = new User({
    _id: "66899a02cedcd3939b0cced7",
    email: "dahou22@gmail.com",
  });

  const token = new tokenModel({
    user: user._id,
    refreshToken: refreshToken,
  });
  token.save = jest.fn();
  tokenModel.findOne = jest.fn().mockResolvedValue(token);
  User.findById = jest.fn().mockResolvedValue(false);

  jwt.verify = jest.fn().mockReturnValue({
    id: user._id,
    email: user.email,
  });
  jwt.decode = jest.fn().mockReturnValue({
    exp: new Date().getTime() - Date.now() + 1000,
  });

  await expect(() =>
    validateAccessToken(accessToken, refreshToken),
  ).rejects.toThrowError(ApiError.UnauthorizedError("User unauthorized"));
});

test("removeToken should remove the token", async () => {
  const refreshToken = jwt.sign(
    { _id: uuidv7() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME },
  );

  tokenModel.findOne = jest.fn().mockResolvedValue({ refreshToken });

  await removeToken(refreshToken);

  expect(tokenModel.deleteOne).toHaveBeenCalledWith({ refreshToken });
});

test("validateAccessToken should throw UnauthorizedError for blacklisted token", async () => {
  const accessToken = jwt.sign(
    { _id: "66899a02cedcd3939b0cced7", email: "dahou22@gmail.com" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME },
  );

  redis.hexists.mockResolvedValue(true);

  await expect(() => validateAccessToken(accessToken)).rejects.toThrowError(
    ApiError.UnauthorizedError("User unauthorized"),
  );
});
