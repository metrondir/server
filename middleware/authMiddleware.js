const ApiError = require('./apiError');
const {validateAccessToken} = require('../services/tokenService');

module.exports = function ( req, res, next) {
	try {
	
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			throw ApiError.Forbbiden("User unauthenticated");
		}
		const accessToken = authHeader.split(' ')[1];
		
		if (!accessToken || accessToken === 'null' && !req.cookies.refreshToken) {
			throw ApiError.Forbbiden("User unauthenticated");
		}
		const userData = validateAccessToken(accessToken);
	   
		if (!userData) {
			throw ApiError.UnauthorizedError("User unauthorized");
		}
		req.user = userData;
		
		next();
		
	} catch (error) {
		return next( error);
	}
	
}