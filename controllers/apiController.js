const asyncHandler = require("express-async-handler");
const {
  fetchRecipes,
  fetchRandomRecipes,
  fetchRecommendedRecipes,
  fetchInformationById,
  fetchFavoriteRecipes,
  fetchRecipesByIngredients,
  fetchRecipesByCategories,
} = require("../services/recipesFetchingService");
const {
  redisGetModelsWithPaginating,
} = require("../middleware/paginateMiddleware");
const {
  TranslateRecipeInformation,
} = require("../services/translationService");
const getRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    const {
      query,
      limit,
      type,
      diet,
      cuisine,
      maxReadyTime,
      language,
      page,
      size,
      currency,
    } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}search-recipes${refreshToken}${language}${query}${currency}${limit}${type}${diet}${cuisine}${maxReadyTime}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRecipes,
      query,
      limit,
      type,
      diet,
      cuisine,
      maxReadyTime,
      language,
      currency,
      refreshToken,
    );

    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

const getRandomRecipes = asyncHandler(async (req, res, next) => {
  console.log(req);

  try {
    const { limit, language, page, size, currency } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];

    const { refreshToken } = req.cookies;

    const redisKey = `${clientIp}random-recipes${refreshToken}${language}${currency}${limit}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRandomRecipes,
      limit,
      language,
      refreshToken,
      currency,
    );

    res.status(200).json(recipes);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

const getInformationById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, currency } = req.query;
    const { refreshToken } = req.cookies;
    const recipes = await fetchInformationById(
      id,
      language,
      currency,
      refreshToken,
    );
    res.status(200).json(recipes);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

const getRecommendedRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, currency, page, size } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}recomended-recipes${id}${language}${currency}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRecommendedRecipes,
      id,
      language,
      currency,
    );
    const filteredDbRecipes = recipes.filter((recipe) => recipe);
    res.status(200).json(filteredDbRecipes);
  } catch (error) {
    next(error);
  }
});

const getFavouriteRecipes = asyncHandler(async (req, res, next) => {
  try {
    const id = req.user.id;
    const { language, page, size, currency } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}favourite-recipes${id}${language}${currency}`;

    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchFavoriteRecipes,
      id,
      language,
      currency,
    );
    res.status(200).json(recipes);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

const getRecipesByIngridients = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    const { ingredients, number, language, page, size, currency } = req.query;

    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}searchByIngredients-recipes${refreshToken}${language}${currency}${number}${ingredients}`;

    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRecipesByIngredients,
      number,
      language,
      currency,
      refreshToken,
      ingredients,
    );
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

const translateRecipe = asyncHandler(async (req, res, next) => {
  try {
    const { language, page, size } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];

    const redisKey = `${clientIp}translate-recipes$${language}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      TranslateRecipeInformation,
      req.body,
      language,
    );

    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

const getRecipesByCategories = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    const {
      query,
      limit,
      sort,
      sortDirection,
      language,
      page,
      size,
      currency,
    } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];

    const redisKey = `${clientIp}categories-recipes${refreshToken}${language}${currency}${limit}${query}${sort}${sortDirection}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRecipesByCategories,
      query,
      limit,
      sort,
      sortDirection,
      language,
      currency,
      refreshToken,
    );

    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

module.exports = {
  getRecipes,
  getRandomRecipes,
  getInformationById,
  getRecommendedRecipes,
  getFavouriteRecipes,
  getRecipesByIngridients,
  translateRecipe,
  getRecipesByCategories,
};
