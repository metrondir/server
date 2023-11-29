const ApiError = require('./apiError');
const {validateAccessToken} = require('../services/tokenService');

module.exports = function ( req, res, next) {
	try {
		console.log(req.headers.authorization)
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			throw ApiError.Forbbiden("User dont sent token");
		}
		const accessToken = authHeader.split(' ')[1];
		if (!accessToken) {
			throw ApiError.UnauthorizedError("User unauthorized");
		}
		const userData = validateAccessToken(accessToken);
	
		if (!userData) {
			throw ApiError.UnauthorizedError("User unauthorized");
		}
		req.user = userData;
		
		next();
		
	} catch (error) {
		return next(ApiError.UnauthorizedError("User unauthorized", error));
	}
	
}