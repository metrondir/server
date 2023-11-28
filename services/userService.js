const User  = require('../models/userModel');
const bcrypt = require('bcrypt');
const asyncHandler = require('express-async-handler');
const uuid = require('uuid');
const EmailService = require('./gmailService');
const gmailService = new EmailService();
const jwt = require('jsonwebtoken');
const { generateTokens, saveTokens, removeToken,validateRefreshToken,findToken } = require('./tokenService');
const UserDto = require('../dtos/userDtos');
const ApiError = require('../middleware/apiError');
const paginateMiddleware = require('../middleware/paginateMiddleware');
const redis = require('../config/redisClient');
const axios = require('axios');
const qs = require('qs');

const registration = asyncHandler(async(username,email,password) => {
	const candidate = await User.findOne({email});
	if(candidate) {
		throw ApiError.BadRequest(`User with this email ${email} already registered`);
	}
	const hashedPassword = await bcrypt.hash(password,10);
	const activationLink = uuid.v4();
	
	const user = await User.create({username,email,password: hashedPassword,activationLink});
	await gmailService.sendActivationGmail(email,`${process.env.API_URL}/api/users/activate/${activationLink}`);
	
	const userDto = new UserDto(user);
	const tokens = generateTokens({...userDto});
	await saveTokens(userDto.id, tokens.refreshToken);

	
	return {...tokens,user: userDto};
});

	const activate = asyncHandler(async(activationLink)=> {
	const user = await User.findOne({activationLink});
	if(!user) {
		throw ApiError.BadRequest('Incorrect activation link');
	}
	user.isActivated = true;
	await user.save();
	});

	
	const login = asyncHandler(async(email,password) => {
		const user = await User.findOne({email});
			if(!user) {
				throw ApiError.BadRequest(`User with this email ${email} not found`);
			}
			
			const isPassEquals = await bcrypt.compare(password,user.password);
			if(!isPassEquals) {
				throw ApiError.BadRequest('Incorrect password');
			}
			const userDto = new UserDto(user);
			const tokens = generateTokens({...userDto});
			await saveTokens(userDto.id, tokens.refreshToken);

			return {...tokens,user: userDto};
	});

	const logout = asyncHandler(async(refreshToken) => {
		const token= await removeToken(refreshToken);
		return token;
	});
	const  refresh = asyncHandler(async (refreshToken) => {
		if(!refreshToken) {
			throw ApiError.UnauthorizedError();
		}
		const userData = validateRefreshToken(refreshToken);
		const tokenFromDb = await findToken(refreshToken);
		if(!userData || !tokenFromDb) {
			throw ApiError.UnauthorizedError();
		}
		const user = await User.findById(tokenFromDb.user);
		const userDto = new UserDto(user);
		const tokens = generateTokens({...userDto});

		await saveTokens(userDto.id, tokens.refreshToken);
		return {...tokens,user: userDto};

	});

const getAllUsers = asyncHandler(async (req, res, next) => {

	const users = await redisGetUsers(req,res,next);
	res.status(200).json(users);
 });


 
 const redisGetUsers = async (req, res, next) => {
	try {
	  const { page, limit } = req.query;
	  const redisKey = `users:${page}:${limit}`;
 
	  const redisUsers = await new Promise((resolve, reject) => {
		 redis.get(redisKey, (err, redisUsers) => {
			if (err) {
			  reject(err);
			} else {
			  resolve(redisUsers);
			}
		 });
	  });
 
	  if (redisUsers) {
		 console.log('Redis has users');
		 res.json(JSON.parse(redisUsers));
	  } else {
		 console.log('Redis does not have users');
		 await paginateMiddleware.paginate(User)(req, res, () => {});
		 const paginatedResult = res.paginatedResult;
 
		 if (!paginatedResult) {
			throw new Error('Error: paginatedResult is undefined');
		 } else {
			redis.setex(redisKey, process.env.DEFAULT_EXPIRATION, JSON.stringify(paginatedResult));
			res.json(paginatedResult);
		 }
	  }
	  
	} catch (error) {
	  next(error);
	}
 };
 

	const forgetPassword = asyncHandler(async(email ,password) => {
		const user = await User.findOne({email});
			if(!user) {
				throw ApiError.BadRequest(`User with this email ${email} not found`);
			}
			
			const isPassEquals = await bcrypt.compare(password,user.password);
			if(!isPassEquals) {
				throw ApiError.BadRequest('Incorrect password');
			}
			const changePasswordLink = uuid.v4();
			await gmailService.sendChangePasswordUser(email,`${process.env.API_URL}/api/users/change-password/${changePasswordLink}`);
			user.changePasswordLink = changePasswordLink;
			await user.save();
			return changePasswordLink;
	});

	const changePassword = asyncHandler(async(email,password,refreshToken)=> {
		if(!password) {
			 throw ApiError.BadRequest('Incorrect new password');
		}
		if(!refreshToken) {
			throw ApiError.UnauthorizedError();
		}
		const user = await User.findOne({email, changePasswordLink: {$exists: true, $ne: null}}); 
		if(!user) {
			throw ApiError.BadRequest(`User doest not exsit or link has been expired`);
		}
		if(password===user.password) {
		throw ApiError.BadRequest(`New password can not be the same as old password`);
		}
		if(email!==user.email) {
			throw ApiError.BadRequest(`User with this email ${email} not found`);
		}
		const hashedPassword = await bcrypt.hash(password,10);
		user.password = hashedPassword;
		user.changePasswordLink = null;
		await user.save();
		const userDto = new UserDto(user);
		const tokens = generateTokens({...userDto});
		await saveTokens(userDto.id, tokens.refreshToken);
		return {...tokens,user: userDto};

  });
		const changePasswordLink = asyncHandler(async(changePasswordLink)=> {
			if(!changePasswordLink) {
				throw ApiError.BadRequest('Incorrect change password link');
			}
				return changePasswordLink;
		});

		const getGoogleOauthTokens = asyncHandler(async (code) => {
			const url = 'https://oauth2.googleapis.com/token';
			const data = {
			  code: code,
			  client_id: process.env.CLIENT_ID_GOOGLE,
			  client_secret: process.env.CLIENT_SECRET_GOOGLE,
			  redirect_uri: process.env.CLIENT_REDIRECT_GOOGLE,
			  grant_type: 'authorization_code',
			};
		 
			if (!data.client_id || !data.client_secret || !data.redirect_uri) {
			  throw new Error('Missing required environment variable');
			}
		 
			try {
			  const response = await axios.post(url, qs.stringify(data), {
				 headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				 },
			  });
		 
			  return response.data;
			} catch (error) {
			  throw new ApiError.BadRequest(`Google OAuth token error: ${error.response?.data || error.message}`);
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
			  console.error(error);
			  throw error;
			}
		 });
		 
		 const findAndUpdateUser = asyncHandler(async (query, update, options = {}) => {
			return User.findOneAndUpdate(query, update, options);
		 });

		 const googleOauthHandler = asyncHandler(async (req, res, next) => {
			const code = req.query.code;
		 
			try {
			  console.log('Authorization Code:', code);
			  const { id_token, access_token } = await getGoogleOauthTokens(code);
			  const googleUser = jwt.decode(id_token);
			  console.log(googleUser);
			  console.log(id_token, access_token);
		 
			  const googleUserData = await getGoogleUser({ id_token, access_token }); // Changed variable name
			  if (!googleUserData.verified_email) {
				 return res.status(403).json({ error: "Email is not verified" });
			  }
		 
			  console.log(googleUserData);
		 
			  const user = await findAndUpdateUser(
				{ email: googleUserData.email },
				{ 
				  username: googleUserData.name,
				  picture: googleUserData.picture,
				},
				{ upsert: true, new: true }
			 );
			 
			 if (!user) {
				// Handle the case where no user is returned
				console.error('No user returned from findAndUpdateUser');
				return res.status(404).json({ error: 'User not found' });
			 }
			  const userDto = new UserDto(user);
			  const tokens = generateTokens({ ...userDto });
			  await saveTokens(userDto.id, tokens.refreshToken);
			  res.cookie("refreshToken", tokens.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true,path: "/api/users/refresh", secure: true });
			  res.redirect(`${process.env.API_URL}`);
			  return res.json({ ...tokens, user: userDto });
			} catch (error) {
			  console.error(error);
			  // Use next to pass errors to the error-handling middleware
			}
		 });
		 
module.exports= {registration,activate,login,logout,refresh,getAllUsers,forgetPassword,changePassword,changePasswordLink,googleOauthHandler};
