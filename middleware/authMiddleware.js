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
			throw res.json({message: "Invalid accessToken in accessMiddleware in authMiddleware in if(!accessToken)"});
		}
		const userData = validateAccessToken(accessToken);
	
		if (!userData) {
			throw res.json({message: "Invalid accessToken in accessMiddleware in authMiddleware in if(!userData)"});
		}
		req.user = userData;
		next();
		
	} catch (error) {
		return res.json({message: "Invalid accessToken in accessMiddleware in authMiddleware in if(catch)"});
	}
	
}