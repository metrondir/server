const asyncHandler = require("express-async-handler");
const ApiError = require("./apiError");
const redis = require("../config/redisClient");

const redisGetModels = async (model, req, res, next, conditions = {}) => {
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
      console.log("FROM Redis");
      res.json(JSON.parse(redisModels));
    } else {
      console.log("FROM DB");
      const models = await model.find(conditions);
      redis.setex(
        redisKey,
        process.env.DEFAULT_EXPIRATION_REDIS_KEY_TIME,
        JSON.stringify(models),
      );
      res.json(models);
    }
  } catch (error) {
    throw ApiError.BadRequest(error.message);
  }
};

const redisGetModelsWithPaginating = async (
  data,
  page,
  size,
  req,
  res,
  next,
) => {
  try {
    const redisKey = "allData";
    const redisData = await new Promise((resolve, reject) => {
      redis.get(redisKey, (err, redisData) => {
        if (err) {
          reject(err);
        } else {
          resolve(redisData);
        }
      });
    });

    if (redisData) {
      console.log("FROM Redis");
      const parsedData = JSON.parse(redisData);
      const paginatedResult = paginateArray(parsedData, page, size);
      res.json(paginatedResult);
    } else {
      console.log("FROM DB");
      redis.setex(
        redisKey,
        process.env.DEFAULT_EXPIRATION_REDIS_KEY_TIME,
        JSON.stringify(data),
      );

      const paginatedResult = paginateArray(data, page, size);

      if (!paginatedResult) {
        throw ApiError.BadRequest("Too low results in model");
      } else {
        res.json(paginatedResult);
      }
    }
  } catch (error) {
    throw ApiError.BadRequest(error.message);
  }
};

const calculatePagination = (page, size, totalItems) => {
  const startIndex = (page - 1) * size;
  const endIndex = page * size;

  const hasPrevious = page > 1;
  const hasNext = endIndex < totalItems;

  return { startIndex, endIndex, hasPrevious, hasNext };
};

const paginateArray = (data, page, size) => (req, res, next) => {
  try {
    if (!size || !page) {
      res.locals.paginatedData = data;
      return next();
    }
    const totalItems = data.length;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(size) || totalItems;

    if (isNaN(pageNumber) || pageNumber < 1) {
      throw new Error("Page must be greater than 0");
    }
    if (isNaN(pageSize) || pageSize < 1) {
      throw new Error("Limit must be greater than 0");
    }
    if (pageSize > totalItems) {
      throw new Error(
        `Limit cannot be greater than total items: ${totalItems}`,
      );
    }
    if (totalItems <= 0) {
      throw new Error(`Dont have items ${totalItems}`);
    }
    const { startIndex, endIndex, hasPrevious, hasNext } = calculatePagination(
      pageNumber,
      pageSize,
      totalItems,
    );

    const result = {
      next: hasNext
        ? { page: pageNumber + 1, size: totalItems - pageSize * page }
        : undefined,
      previous: hasPrevious
        ? { page: pageNumber - 1, size: pageSize }
        : undefined,
      totalItems: totalItems,
    };

    result.results = data.slice(startIndex, endIndex);

    res.locals.paginatedData = result;
    next();
  } catch (error) {
    next(error);
    throw new Error(error);
  }
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
    res.json("Error deleting keys:", error.message);
  }
};

module.exports = {
  redisGetModelsWithPaginating,
  redisGetModels,
  onDataChanged,
  paginateArray,
};
