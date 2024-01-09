const axios = require('axios');
const qs = require('qs');
const bcrypt = require('bcrypt');
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../middleware/apiError");
const UserDto = require("../dtos/userDtos");
const { generateTokens, saveTokens } = require("./tokenService");


const getGoogleOauthTokens = asyncHandler(async (code) => {
	const url = 'https://oauth2.googleapis.com/token';
	const data = {
	  code: code,
	  client_id: process.env.CLIENT_ID_GOOGLE,
	  client_secret: process.env.CLIENT_SECRET_GOOGLE,
	  redirect_uri: process.env.CLIENT_REDIRECT_GOOGLE,
	  grant_type: 'authorization_code',
	};
	try {
	  const response = await axios.post(url, qs.stringify(data), {
		 headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		 },
	  });
 
	  return response.data;
	} catch (error) {
	  throw ApiError.BadRequest(`Google OAuth token error: ${error.response?.data || error.message}`);
	}
 });
 
 
 const getGoogleUser = asyncHandler(async ({ id_token, access_token }) => {
	try {
	  const response = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`, {
		 headers: {
			Authorization: `Bearer ${id_token}`,
		 },
	  });
	  return response.data;
	} catch (error) {
	  throw ApiError.BadRequest(`Google OAuth user error: ${error.response?.data || error.message}`);
	}
 });
 

 const findAndUpdateUser = asyncHandler(async (query, update, options = {}) => {
	return User.findOneAndUpdate(query, update, options);
 });


 const googleOauthHandler = asyncHandler(async (req, res, next) => {
	const code = req.query.code;
	try {
	  const { id_token, access_token } = await getGoogleOauthTokens(code);	
	  const googleUserData = await getGoogleUser({ id_token, access_token }); 

	  if (!googleUserData.verified_email) {
		 return ApiError.Forbbiden({ error: "Email is not verified" });
	  } 
	  const user = await findAndUpdateUser(
		{ email: googleUserData.email },
		{ username: googleUserData.name,
		  picture: googleUserData.picture,
		  password: bcrypt.hashSync(googleUserData.id, 10),
		  isActivated: true},
		  
		{ upsert: true, new: true }
	 );
	  const userDto = new UserDto(user);
	  const tokens = generateTokens({ ...userDto });
	  await saveTokens(userDto.id, tokens.refreshToken);
	  res.cookie("refreshToken", tokens.refreshToken, { maxAge: process.env.COOKIE_MAX_AGE, secure: true,sameSite: 'None' });
	  res.redirect("http://my.porno365.bond/"); 

	} catch (error) {
	 throw ApiError.BadRequest(error.response?.data || error.message);
	}
 });


 module.exports = {googleOauthHandler};