const { isUserLogged } = require("../services/tokenService");

module.exports = async function (req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = req.cookies.accessToken;
    req.user = req.user || {};
    if (accessToken == null || refreshToken == null) {
      req.user.isLogged = false;
      req.user.id = null;
      return next();
    }

    const { userData } = await isUserLogged(accessToken, refreshToken);
    req.user = userData;
    next();
  } catch (error) {
    return next(error);
  }
};
