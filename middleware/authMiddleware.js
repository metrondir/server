const ApiError = require('./apiError');
const {validateAccessToken} = require('../services/tokenService');

module.exports = function ( req, res, next) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			throw ApiError.Forbbiden("User dont sent token");
		}
		const accessToken = authHeader.split(' ')[1];
		if (!accessToken) {
			throw ApiError.UnauthorizedError("User unauthorized in if(!accessToken)");
		}
		const userData = validateAccessToken(accessToken);
	
		if (!userData) {
			throw ApiError.UnauthorizedError("User unauthorized in if(!userData)");
		}
		req.user = userData;
		next();
		
	} catch (error) {
		return next(ApiError.UnauthorizedError("User unauthorized in catch", error));
	}
	
}