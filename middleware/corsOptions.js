const ApiError = require('./apiError');


const whitelist = [`${process.env.API_URL}`];

const corsOptions = {
  origin: function (origin, callback) {

    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      throw ApiError.BadRequest('Not allowed by CORS');
    }
  },
  withCredentials: true,
};

module.exports = corsOptions;