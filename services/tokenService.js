const jwt = require("jsonwebtoken");
const tokenModel = require("../models/tokenModel");
const asynchHandler = require("express-async-handler");
function generateTokens (payload) {
	const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
	const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
	
	return { accessToken, refreshToken };
}

 function validateAccessToken(token){
	try {
		const userData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		console.log(userData);
		return userData;
		
	} catch (error) {
		return null;
	}	
}
 function validateRefreshToken(token){
	try {
		const userData = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
		return userData;
	} catch (error) {
		return null;
	}	
}
	const saveTokens = asynchHandler(async(userId, refreshToken)=> {
		const tokenData = await tokenModel.findOne({ user: userId });
		if(tokenData) {
			tokenData.refreshToken = refreshToken;
			return tokenData.save();
		}
		const token = await tokenModel.create({ user: userId, refreshToken });
		return token;
	});
	const  removeToken = asynchHandler(async(refreshToken)=> {
	const tokenData = await tokenModel.deleteOne({ refreshToken });
	return tokenData;
});

const findToken = asynchHandler(async(refreshToken)=> {
	const tokenData = await tokenModel.findOne({ refreshToken });
	return tokenData;
});


  module.exports = { generateTokens, saveTokens, removeToken,validateAccessToken,validateRefreshToken,findToken };