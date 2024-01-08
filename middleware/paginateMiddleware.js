const asyncHandler = require("express-async-handler");
const ApiError = require("./apiError");
const redis = require('../config/redisClient');


const redisGetModels= async (model,req, res, next,conditions = {}) => {
	try {

	  const redisKey = `${model.modelName.toLowerCase()}`;
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
		console.log("FROM Redis")
		 res.json(JSON.parse(redisModels));
	  } else {
		 console.log("FROM DB")
		 const models = await model.find(conditions); 
		 redis.setex(redisKey, process.env.DEFAULT_EXPIRATION_REDIS_KEY_TIME, JSON.stringify(models));
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
		 res.json(JSON.parse(redisModels));
	  } else {
		 await paginate(model,conditions)(req, res, () => {});
		 
		 const paginatedResult = res.paginatedResult;
		 if (!paginatedResult) {
			throw ApiError.BadRequest('Too low results in model');
		 } else {
			redis.setex(redisKey, process.env.DEFAULT_EXPIRATION_REDIS_KEY_TIME, JSON.stringify(paginatedResult));
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
				throw ApiError.BadRequest('Page must be greater than 0');
				}
			  if (isNaN(limit) || limit < 1) {
				throw ApiError.BadRequest('Limit must be greater than 0');
			  }
			  if(limit > totalDocuments){
				throw ApiError.BadRequest(`Limit cannot be greater than total documents: ${totalDocuments}`);

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
        } catch (error) {
            throw ApiError.BadRequest(error.message);
          
        }
    });
};
const onDataChanged = async (modelName) => {
	try {
		const patern = `${modelName.toLowerCase()}`;

	  const keys = await redis.keys(patern);
 
	  const deletePromises = keys.map((key) => {
		
		 return redis.del(key);
	  });

	  await Promise.all(deletePromises);

	} catch (error) {
	  res.json('Error deleting keys:', error.message);
	}
 };

module.exports = {redisGetModelsWithPaginating, redisGetModels,onDataChanged };