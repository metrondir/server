const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const tokenModel = require("../models/tokenModel");
function generateTokens (payload) {
	const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30s' });
	const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
	
	return { accessToken, refreshToken };
}

 function validateAccessToken(token){
	try {
		console.log("The accessToken is :",token);
		const userData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		console.log(userData);
		return userData;
		
	} catch (error) {
		throw new Error('Invalid access token');
	}	
}
 function validateRefreshToken(token){
	try {
		console.log("The refreshToken is :",token);
		const userData = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
		return userData;
	} catch (error) {
		return null;
	}	
}
	const saveTokens = asyncHandler(async(userId, refreshToken) =>{
		const tokenData = await tokenModel.findOne({ user: userId });
		if(tokenData) {
			tokenData.refreshToken = refreshToken;
			return tokenData.save();
		}
		const token = await tokenModel.create({ user: userId, refreshToken });
		return token;
	});
  const removeToken = asyncHandler(async(refreshToken) =>{
	const tokenData = await tokenModel.deleteOne({ refreshToken });
	return tokenData;
});

const findToken = asyncHandler(async(refreshToken) =>{
	const tokenData = await tokenModel.findOne({ refreshToken });
	return tokenData;
});



  module.exports = { generateTokens, saveTokens, removeToken,validateAccessToken,validateRefreshToken,findToken };