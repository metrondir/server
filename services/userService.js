const User  = require('../models/userModel');
const bcrypt = require('bcrypt');
const asyncHandler = require('express-async-handler');
const uuid = require('uuid');
const EmailService = require('./gmailService');
const gmailService = new EmailService();
const { generateTokens, saveTokens, removeToken,validateRefreshToken,findToken } = require('./tokenService');
const UserDto = require('../dtos/userDtos');
const ApiError = require('../middleware/apiError');



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
	const activate= asyncHandler(async(activationLink)=> {
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

	const  getAllUsers = asyncHandler(async() => {
		const users = await User.find();
		return users;
	});
module.exports= {registration,activate,login,logout,refresh,getAllUsers};
