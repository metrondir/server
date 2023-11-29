const User  = require('../models/userModel');
const bcrypt = require('bcrypt');
const asyncHandler = require('express-async-handler');
const uuid = require('uuid');
const EmailService = require('./gmailService');
const gmailService = new EmailService();
const { generateTokens, saveTokens, removeToken,validateRefreshToken,findToken } = require('./tokenService');
const UserDto = require('../dtos/userDtos');
const ApiError = require('../middleware/apiError');
const {redisGetModelsWithPaginating, redisGetModels } = require('../middleware/paginateMiddleware');


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


		 
module.exports= {registration,activate,login,logout,refresh,forgetPassword,changePassword,changePasswordLink};
