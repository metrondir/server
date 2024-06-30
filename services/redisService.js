const ApiError = require("../middleware/apiError");
const redis = require("../config/redisClient");
const { paginateArray } = require("./paginatedService");
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
  page,
  redisKey,
  size,
  func,
  limit,
  language,
  refreshToken,
  currency,
  ...args
) => {
  try {
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
      return paginatedResult;
    } else {
      console.log("FROM DB");

      const data = await func(limit, language, refreshToken, currency, ...args);

      redis.setex(redisKey, 60, JSON.stringify(data));

      if (!data || data.length === 0) {
        return [];
      } else {
        const paginatedResult = paginateArray(data, page, size);
        return paginatedResult;
      }
    }
  } catch (error) {
    console.log(error);
    throw ApiError.BadRequest(error.message);
  }
};
const getRecipesFromUserIdFromRedis = async (userId) => {
  const keys = await redis.keys(`recipe:${userId}*`);

  const recipes = [];

  for (const key of keys) {
    const recipeData = await redis.hgetall(key);

    const recipe = JSON.parse(recipeData.data);
    recipes.push(recipe);
  }

  return recipes;
};
const getRecipeByUserIdAndRecipeId = async (userId, recipeId) => {
  const key = `recipe:${userId}${recipeId}`;
  const recipeData = await redis.hget(key, "data");

  const recipe = JSON.parse(recipeData);
  return recipe;
};
const storeRegistrationDetails = async (activationLink, details) => {
  await redis.hset("registrations", activationLink, JSON.stringify(details));
};
const storeRecipe = async (recipe) => {
  const key = `recipe:${recipe.user}${recipe.id}`;
  const field = "data";
  const value = JSON.stringify(recipe);
  await redis.hset(key, field, value);
  await redis.expire(key, process.env.COOKIE_MAX_AGE / 10000);
};

const getRegistrationDetailsByActivationLink = async (activationLink) => {
  const detailsString = await redis.hget("registrations", activationLink);
  return detailsString ? JSON.parse(detailsString) : null;
};

const deleteRegistrationDetailsByActivationLink = async (activationLink) => {
  await redis.hdel("registrations", activationLink);
};
const storeCustomer = async (customer) => {
  const key = `customer:${customer.data[0].id}`;
  const field = "data";
  const value = JSON.stringify(customer);
  await redis.hset(key, field, value);
  await redis.expire(key, 600);

  const customerData = await redis.hget(key, "data");
  return JSON.parse(customerData);
};
const getCustomer = async (customerId) => {
  const key = `customer:${customerId}`;
  const customerData = await redis.hget(key, "data");
  return JSON.parse(customerData);
};
const deleteCustomer = async (customerId) => {
  const key = `customer:${customerId}`;
  await redis.del(key);
};

const setBlackListToken = async (token) => {
  try {
    const expirationTime =
      parseInt(process.env.ACCESS_TOKEN_EXPIRATION_TIME, 10) * 60;

    await redis.hset("blacklist", token, "blacklisted");

    await redis.expire("blacklist", expirationTime);
  } catch (error) {
    console.error(`Error setting blacklist for token ${token}:`, error);
  }
};

const checkBlackListToken = async (token) => {
  try {
    const exists = await redis.hexists("blacklist", token);

    if (exists) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error checking blacklist for token ${token}:`, error);
    return false;
  }
};

const onDataChanged = async (ipAddress) => {
  try {
    const pattern = `${ipAddress}*`;

    const keys = await redis.keys(pattern);

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
  storeRegistrationDetails,
  getRegistrationDetailsByActivationLink,
  deleteRegistrationDetailsByActivationLink,
  storeRecipe,
  getRecipesFromUserIdFromRedis,
  getRecipeByUserIdAndRecipeId,
  storeCustomer,
  getCustomer,
  deleteCustomer,
  setBlackListToken,
  checkBlackListToken,
};
