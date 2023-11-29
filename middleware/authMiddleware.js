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
			throw ApiError.UnauthorizedError("Invalid access token in authMiddleware");
		}
		const userData = validateAccessToken(accessToken);
	
		if (!userData) {
			throw ApiError.UnauthorizedError("Invalid token in userdata authMiddleware");
		}
		req.user = userData;
		next();
		
	} catch (error) {
		return next(ApiError.UnauthorizedError("Invalid token in catch authMiddleware"));
	}
	
}