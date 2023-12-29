const User  = require('../models/userModel');
const bcrypt = require('bcrypt');
const asyncHandler = require('express-async-handler');
const uuid = require('uuid');
const EmailService = require('./gmailService');
const gmailService = new EmailService();
const { generateTokens, saveTokens, removeToken,validateRefreshToken,findToken } = require('./tokenService');
const UserDto = require('../dtos/userDtos');
const ApiError = require('../middleware/apiError');


const registration = asyncHandler(async (username, email, password) => {
	await validateEmailUniqueness(email);

	const hashedPassword = await bcrypt.hash(password, 10);
	const activationLink = uuid.v4();

	const user = await createUser(username, email, hashedPassword, activationLink);
	await sendActivationEmail(email, `${process.env.API_URL}/api/users/activate/${activationLink}`);

	const userDto = new UserDto(user);
	const tokens = generateTokens({ ...userDto });
	await saveTokens(userDto.id, tokens.refreshToken);
	return { ...tokens, user: userDto };
	
});

async function validateEmailUniqueness(email) {
	const candidate = await User.findOne({ email });
	if (candidate) {
		 throw ApiError.BadRequest(`User with this email ${email} already registered`);
	}
}

async function createUser(username, email, hashedPassword, activationLink) {
	return await User.create({ username, email, password: hashedPassword, activationLink });
}

async function sendActivationEmail(to, link) {
	await gmailService.sendActivationGmail(to, link);
}


	const activate = asyncHandler(async(activationLink)=> {
	const user = await User.findOne({activationLink: activationLink});
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
		console.log(refreshToken);
		if(!refreshToken) {
			throw ApiError.UnauthorizedError("User unauthorized");
		}
		const userData = validateRefreshToken(refreshToken);
		const tokenFromDb = await findToken(refreshToken);
		if(!userData || !tokenFromDb) {
			throw ApiError.UnauthorizedError("User unauthorized");
		}
		const user = await User.findById(tokenFromDb.user);
		const userDto = new UserDto(user);
		const tokens = generateTokens({...userDto});
	
		await saveTokens(userDto.id, tokens.refreshToken);
		return {...tokens,user: userDto};

	});


	const forgetPassword = asyncHandler(async(email) => {
		const user = await User.findOne({email});
			if(!user) {
				throw ApiError.BadRequest(`User with this email ${email} not found`);
			}
			
			if(!user.isActivated) {
				throw ApiError.BadRequest('User is not activated');
			}
			const changePasswordLink = uuid.v4();
			await gmailService.sendChangePasswordUser(email,`${process.env.API_URL}/api/users/change-password/${changePasswordLink}`);
			user.changePasswordLink = changePasswordLink;
			user.isChagePasswordLink = false;
			await user.save();
			return changePasswordLink;
	});

	const changePassword = asyncHandler(async(email,password)=> {

		if(!password) {
			 throw ApiError.BadRequest('Incorrect new password');
		}
		const user = await User.findOne({email, changePasswordLink: {$exists: true, $ne: null}}); 
		if(!user) {
			throw ApiError.BadRequest(`User doest not exsit or link has been expired`);
		}
		if(!user.isChangePasswordLink){
			throw ApiError.BadRequest(`User not activate link for change password`);
		}	
		if(email!==user.email) {
			throw ApiError.BadRequest(`User with this email ${email} not found`);
		}
		const hashedPassword = await bcrypt.hash(password,10);
		const isMatch = await bcrypt.compare(password, user.password);
  		if(isMatch) {
    		throw ApiError.BadRequest(`New password cannot be the same as old password`);
  		}
		
		user.password = hashedPassword;
		user.changePasswordLink = undefined;
		user.isChangePasswordLink = undefined;
		await user.save();
		const userDto = new UserDto(user);
		const tokens = generateTokens({...userDto});
		await saveTokens(userDto.id, tokens.refreshToken);
		return {...tokens,user: userDto};

  });
		const changePasswordLink = asyncHandler(async(changePasswordLink)=> {
			const user = await User.findOne({changePasswordLink: changePasswordLink});
			if (!user) {
				throw ApiError.BadRequest('Invalid change password link');
			 }
				user.isChangePasswordLink = true;
				await user.save();
		});


		 
module.exports= {registration,activate,login,logout,refresh,forgetPassword,changePassword,changePasswordLink};
