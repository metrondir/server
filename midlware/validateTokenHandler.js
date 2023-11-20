const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const validateToken = asyncHandler(async (req, res, next) => {
  let token;
  let authHeader = req.headers.Authorization || req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {


        if (!refreshToken) {
          res.status(401);
          return next(new Error("User is not authorized or token is missing"));
        }

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (refreshErr, refreshDecoded) => {
          if (refreshErr) {
            res.status(401);
            return next(new Error("User is not authorized or token is missing"));
          }

          // Generate a new access token
          const newAccessToken = jwt.sign(
            {
              user: {
                username: refreshDecoded.user.username,
                email: refreshDecoded.user.email,
                id: refreshDecoded.user.id,
              },
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "10m" }
          );

          // Update the response with the new access token
          res.setHeader("Authorization", `Bearer ${newAccessToken}`);

          req.user = refreshDecoded.user;
          next();
        });
      } else {
        req.user = decoded.user;
        next();
      }
    });
  } else {
    res.status(401);
    return next(new Error("User is not authorized or token is missing"));
  }
});

module.exports = validateToken;
