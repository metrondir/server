const ApiError = require("./apiError");

module.exports = function (err, req, res, next,message) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, errors: err.errors });
  }
  return res.status(500).json({ message: err.message, errors: err.errors });
}