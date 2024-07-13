const ApiError = require("./apiError");
const { validateAccessToken } = require("../services/tokenService");

module.exports = async function (req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = req.cookies.accessToken;
    if (
      accessToken == null &&
      refreshToken == null &&
      !req.headers.authorization
    ) {
      throw ApiError.Forbidden("User unauthenticated");
    }

    if (
      !accessToken ||
      (accessToken === "null" && !refreshToken && !req.headers.authorization)
    ) {
      throw ApiError.Forbidden("User unauthenticated");
    }
    req.user = req.user || {};
    req.user.isLogged = false;
    const { userData, tokens } = await validateAccessToken(
      accessToken,
      refreshToken,
    );
    req.user = userData;

    if (tokens) {
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
      res.cookie("refreshToken", tokens.refreshToken, {
        maxAge: process.env.COOKIE_MAX_AGE,
        secure: true,
        httpOnly: true,
        sameSite: "none",
      });

      res.cookie("accessToken", tokens.accessToken, {
        maxAge: process.env.COOKIE_MAX_AGE,
        secure: true,
        httpOnly: true,
        sameSite: "none",
      });
    }
    next();
  } catch (error) {
    return next(error);
  }
};
