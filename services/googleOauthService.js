const axios = require("axios");
const qs = require("qs");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../middleware/apiError");
const UserDto = require("../dtos/userDtos");
const { generateTokens, saveTokens } = require("./tokenService");

/**
 * @desc Get the Google OAuth tokens.
 * @param {string} code - The code to get the Google OAuth tokens.
 * @returns {Object} The Google OAuth tokens.
 */
const getGoogleOauthTokens = asyncHandler(async (code) => {
  const url = "https://oauth2.googleapis.com/token";
  const data = {
    code: code,
    client_id: process.env.CLIENT_ID_GOOGLE,
    client_secret: process.env.CLIENT_SECRET_GOOGLE,
    redirect_uri: process.env.CLIENT_REDIRECT_GOOGLE,
    grant_type: "authorization_code",
  };
  try {
    const response = await axios.post(url, qs.stringify(data), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  } catch (error) {
    throw ApiError.BadRequest(
      `Google OAuth token error: ${error.response?.data || error.message}`,
    );
  }
});

/**
 * @desc Get the Google user data.
 * @param {string} id_token - The id token.
 * @param {string} access_token - The access token.
 * @returns {Object} The Google user data.
 */
const getGoogleUser = asyncHandler(async ({ id_token, access_token }) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw ApiError.BadRequest(
      `Google OAuth user error: ${error.response?.data || error.message}`,
    );
  }
});

/**
 * @desc Find and update the user.
 * @param {Object} query - The query to search by.
 * @param {Object} update - The update to apply.
 * @param {Object} options - The options to apply.
 * @returns {boolean} The result of the query.
 */
const findAndUpdateUser = asyncHandler(async (query, update, options = {}) => {
  return User.findOneAndUpdate(query, update, options);
});

/**
 * @desc Google OAuth handler
 * @access public
 * @param {string} req.query.code - The code to get the Google OAuth tokens.
 * @returns {Cookie}  The refresh token and access token set
 * @returns  redirect to client url
 */
const googleOauthHandler = asyncHandler(async (req, res) => {
  const code = req.query.code;
  try {
    const { id_token, access_token } = await getGoogleOauthTokens(code);
    const googleUserData = await getGoogleUser({ id_token, access_token });

    if (!googleUserData.verified_email) {
      return ApiError.Forbbiden({ error: "Email is not verified" });
    }
    const user = await findAndUpdateUser(
      { email: googleUserData.email },
      {
        username: googleUserData.name,
        picture: googleUserData.picture,
        password: bcrypt.hashSync(googleUserData.id, 10),
        isActivated: true,
      },

      { upsert: true, new: true },
    );
    const userDto = new UserDto(user);
    const tokens = generateTokens({ ...userDto });
    await saveTokens(userDto.id, tokens.refreshToken);
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
      sameSite: "None",
    });
    res.redirect(`${process.env.API_URL}`);
  } catch (error) {
    throw ApiError.BadRequest(error.response?.data || error.message);
  }
});

module.exports = { googleOauthHandler };
