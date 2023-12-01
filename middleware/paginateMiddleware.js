const asyncHandler = require("express-async-handler");
const ApiError = require("./apiError");
const redis = require('../config/redisClient');


const redisGetModels= async (model,req, res, next,conditions = {}) => {
	try {
	  const redisKey = `${model.modelName.toLowerCase() + 's'}`;
	  const redisModels = await new Promise((resolve, reject) => {
		 redis.get(redisKey, (err, redisModels) => {
			if (err) {
			  reject(err);
			} else {
			  resolve(redisModels);
			}
		 });
	  });
 
	  if (redisModels) {
		 console.log(`Redis has ${model.modelName.toLowerCase() + 's'}`);
		 res.json(JSON.parse(redisModels));
	  } else {
		 console.log(`Redis does not have ${model.modelName.toLowerCase() + 's'}`);
		 const models = await model.find(conditions); 
		 redis.setex(redisKey, process.env.DEFAULT_EXPIRATION, JSON.stringify(models));
		 res.json(models);
	  }
	} catch (error) {
	  throw ApiError.BadRequest(error.message);
	}
 };
 


const redisGetModelsWithPaginating = async (model, req, res, next,conditions={}) => {
	try {
	  const { page, limit } = req.query;
	  const redisKey = `${model.modelName.toLowerCase()+'s'}:${page}:${limit}`;
	  const redisModels = await new Promise((resolve, reject) => {
		 redis.get(redisKey, (err, redisModels) => {
			if (err) {
			  reject(err);
			} else {
			  resolve(redisModels);
			}
		 });
	  });
 
	  if (redisModels) {
		 console.log(`Redis has ${model.modelName.toLowerCase()+'s'}`);
		 res.json(JSON.parse(redisModels));
	  } else {
		 console.log(`Redis does not have ${model.modelName.toLowerCase()+'s'}`);
		 await paginate(model,conditions)(req, res, () => {});
		 const paginatedResult = res.paginatedResult;
		 if (!paginatedResult) {
			throw ApiError.BadRequest('Error: paginatedResult is undefined');
		 } else {
			redis.setex(redisKey, process.env.DEFAULT_EXPIRATION, JSON.stringify(paginatedResult));
			res.json(paginatedResult);
		 }
	  }
	} catch (error) {
	  throw ApiError.BadRequest(error.message);
	}
 };


function calculatePagination(page, limit, totalDocuments) {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    return {
        startIndex,
        endIndex,
        hasPrevious: startIndex > 0,
        hasNext: endIndex < totalDocuments,
    };
}

    paginate = function (model, conditions = { }) {
    return asyncHandler(async (req, res, next) => {
        try {
			const totalDocuments = await model.countDocuments();
            const page = parseInt(req.query.page) || 1; 
            const limit = parseInt(req.query.limit) || totalDocuments;

				if (isNaN(page) || page < 1) {
				next(new ApiError.BadRequest('Page must be greater than 0'));
				}
			  if (isNaN(limit) || limit < 1) {
				next(new ApiError.BadRequest('Limit must be greater than 0'));
			  }
			  if(limit > totalDocuments){
				next(new ApiError.BadRequest(`Limit cannot be greater than total documents: ${totalDocuments}`));

			  }

            const { startIndex, endIndex, hasPrevious, hasNext } = calculatePagination(page, limit, totalDocuments);

            const sortBy = req.query.sortBy || '_id';
            const sortOrder = req.query.sortOrder && req.query.sortOrder.toLowerCase() === 'desc' ? -1 : 1;

            const result = {
                next: hasNext ? { page: page + 1, limit } : undefined,
                previous: hasPrevious ? { page: page - 1, limit } : undefined,
            };

            result.results = await model.find(conditions).sort({ [sortBy]: sortOrder }).limit(limit).skip(startIndex).exec();

            res.paginatedResult = result;
            next();
        } catch (e) {
            console.error(e.message);
            res.status(400).send(e.message);
        }
    });
};
const onDataChanged = (modelName) => {
	const pattern = `${modelName.toLowerCase() + 's'}:*`;
	redis.keys(pattern, (err, keys) => {
	  if (err) throw err;
 
	  keys.forEach((key) => {
		 redis.del(key, (err) => {
			if (err) throw err;
		 });
	  });
	});
 };

module.exports = { paginate,redisGetModelsWithPaginating, redisGetModels,onDataChanged };