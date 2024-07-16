const ApiError = require("../middleware/apiError");
const redis = require("../config/redisClient");
const { paginateArray } = require("./paginatedService");

/**
 * @desc Gets the models with pagination from Redis or the database.
 * @param {number} page - The page number.
 * @param {string} redisKey - The key to store in Redis.
 * @param {number} size - The size of the page.
 * @param {function} func - The function to call if the data is not in Redis.
 * @param {number} limit - The limit of the query.
 * @param {string} language - The language of the data.
 * @param {string} currency - The currency of the data.
 * @param {any} args - The arguments to pass to the function.
 * @returns {Promise} The paginated result.
 */
const redisGetModelsWithPaginating = async (
  page,
  redisKey,
  size,
  func,
  limit,
  language,
  ...args
) => {
  const redisData = await new Promise((resolve, reject) => {
    redis.get(redisKey, (err, redisData) => {
      if (err) {
        reject(new ApiError(err.message, 500));
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

    const data = await func(limit, language, ...args);

    redis.setex(redisKey, 60, JSON.stringify(data));

    if (!data || data.length === 0) {
      return [];
    } else {
      const paginatedResult = paginateArray(data, page, size);
      return paginatedResult;
    }
  }
};

/**
 * @desc Gets the recipes from the user id.
 * @param {string} userId  The user id.
 * @returns {Object} The recipes from the user.
 */
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

/**
 * @desc Gets the recipe by the user id and recipe id.
 * @param {string} userId - The user id.
 * @param {string} recipeId - The recipe id.
 * @returns {Object} The recipe.
 */
const getRecipeByUserIdAndRecipeId = async (userId, recipeId) => {
  const key = `recipe:${userId}${recipeId}`;
  const recipeData = await redis.hget(key, "data");

  const recipe = JSON.parse(recipeData);
  return recipe;
};

/**
 * @desc Stores the recipe.
 * @param {Object} recipe - The recipe to store.
 * @returns {Promise} The result of the query.
 */
const storeRecipe = async (recipe) => {
  const key = `recipe:${recipe.user}${recipe.id}`;
  const field = "data";
  const value = JSON.stringify(recipe);
  await redis.hset(key, field, value);
  await redis.expire(key, process.env.COOKIE_MAX_AGE / 10000);
};

/**
 * @desc Stores the registration details.
 * @param {string} activationLink - The activation link.
 * @param {Object} details - The details to store.
 * @returns {Promise} The result of the query.
 */
const storeRegistrationDetails = async (activationLink, details) => {
  await redis.hset("registrations", activationLink, JSON.stringify(details));
};

/**
 * @desc Gets the registration details by the activation link.
 * @param {string} activationLink - The activation link.
 * @returns {Promise<Object>} The details.
 */
const getRegistrationDetailsByActivationLink = async (activationLink) => {
  return JSON.parse(await redis.hget("registrations", activationLink));
};

/**
 * @desc Deletes the registration details by the activation link.
 * @param {string} activationLink
 * @returns {Promise} The result of the query.
 */
const deleteRegistrationDetailsByActivationLink = async (activationLink) => {
  await redis.hdel("registrations", activationLink);
};

/**
 * @desc Stores the customer.
 * @param {Object} customer - The customer to store.
 * @returns {Promise} The result of the query.
 */
const storeCustomer = async (customer) => {
  const key = `customer:${customer.data[0].id}`;
  const field = "data";
  const value = JSON.stringify(customer);
  await redis.hset(key, field, value);
  await redis.expire(key, 600);

  const customerData = await redis.hget(key, "data");
  return JSON.parse(customerData);
};

/**
 * @desc Gets the customer.
 * @param {string} customerId - The customer id.
 * @returns {Object} The customer.
 */
const getCustomer = async (customerId) => {
  const key = `customer:${customerId}`;
  const customerData = await redis.hget(key, "data");
  return JSON.parse(customerData);
};

/**
 * @desc Deletes the customer.
 * @param {string} customerId - The customer id.
 * @returns {Promise} The result of the query.
 */
const deleteCustomer = async (customerId) => {
  const key = `customer:${customerId}`;
  await redis.del(key);
};

/**
 * @desc Sets the token to the blacklist.
 * @param {string} token - The token to blacklist.
 * @returns {Promise} The result of the query.
 */
const setBlackListToken = async (token) => {
  const expirationTime =
    parseInt(process.env.ACCESS_TOKEN_EXPIRATION_TIME, 10) * 60;

  await redis.hset("blacklist", token, "blacklisted");

  await redis.expire("blacklist", expirationTime);
};

/**
 * @desc Checks if the token is in the blacklist.
 * @param {string} token - The token to check.
 * @returns {Promise} The result of the query.
 */
const checkBlackListToken = async (token) => {
  const exists = await redis.hexists("blacklist", token);
  return exists;
};

/**
 * @desc Deletes the keys that match the pattern.
 * @param {string} ipAddress - The ip address to match.
 * @returns {Promise} The result of the query.
 */
const onDataChanged = async (ipAddress) => {
  const pattern = `${ipAddress}*`;

  const keys = await redis.keys(pattern);

  const deletePromises = keys.map((key) => {
    return redis.del(key);
  });

  await Promise.all(deletePromises);
};

module.exports = {
  redisGetModelsWithPaginating,
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
