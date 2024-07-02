const asyncHandler = require("express-async-handler");
const {
  fetchRecipesUnified,
  fetchRandomRecipes,
  fetchRecommendedRecipes,
  fetchInformationById,
  fetchFavoriteRecipes,
  fetchRecipesByIngredients,
} = require("../services/recipesFetchingService");
const { redisGetModelsWithPaginating } = require("../services/redisService");
const {
  TranslateRecipeInformation,
} = require("../services/translationService");

// @desc Get recipes
// @route GET /api/spoonacular/recipes?query=chicken&limit=10&type=main course&diet=vegetarian&cuisine=italian&maxReadyTime=20&language=en&currency=USD&page=1&size=10&sort=popularity&sortDirection=desc
// @access public
const getRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies.refreshToken;
    console.log(refreshToken);
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
      sort,
      sortDirection,
    } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}search-recipes${refreshToken}${language}${query}${currency}${limit}${type}${diet}${cuisine}${maxReadyTime}${sort}${sortDirection}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRecipesUnified,
      query,
      limit,
      type,
      diet,
      cuisine,
      maxReadyTime,
      language,
      currency,
      refreshToken,
      sort,
      sortDirection,
    );

    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});
// @desc Get random recipes
// @route GET /api/spoonacular/recipes/random
// @access public
const getRandomRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { limit, language, page, size, currency } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];

    const { refreshToken } = req.cookies.refreshToken;

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
// @desc Get information by id
// @route GET /api/spoonacular/recipes/:id
// @access public
const getInformationById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, currency } = req.query;
    const refreshToken = req.cookies.refreshToken;
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
// @desc Get recommended recipes
// @route GET /api/spoonacular/recipes/recommended/:id
// @access public
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
// @desc Get favourite recipes
// @route GET /api/spoonacular/recipes/favourite
// @access private
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
// @desc Get recipes by ingredients
// @route GET /api/spoonacular/recipes/findByIngredients?ingredients=apples&number=5&language=en&currency=USD&page=1&size=10
// @access public
const getRecipesByIngridients = asyncHandler(async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies.refreshToken;
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
      refreshToken,
      currency,
      ingredients,
    );
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});
// @desc Translate recipe
// @route POST /api/spoonacular/recipes/translate
// @access public
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

module.exports = {
  getRecipes,
  getRandomRecipes,
  getInformationById,
  getRecommendedRecipes,
  getFavouriteRecipes,
  getRecipesByIngridients,
  translateRecipe,
};
