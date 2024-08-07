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
const { paginateArray } = require("../services/paginatedService");
const {
  TranslateRecipeInformation,
} = require("../services/translationService");

/**
 * @desc    Get Unified recipes
 * @route   GET /api/spoonacular/recipes
 * @access  public
 * @param   {string} req.query.query - Query string for the recipes
 * @param   {number} req.query.limit - Number of recipes to fetch
 * @param   {string} req.query.language - Language for the recipes
 * @param   {number} req.query.page - Page number for pagination
 * @param   {number} req.query.size - Size of the page for pagination
 * @param   {Object} req.query.type - Type of the recipe
 * @param   {Object} req.query.diet - Diet of the recipe
 * @param   {Object} req.query.cuisine - Cuisine of the recipe
 * @param   {number} req.query.maxReadyTime - Max ready time of the recipe
 * @param   {string} req.query.sort - Sort by value
 * @param   {boolean} req.user.isLogged - The user is logged in
 * @param   {string} req.user.id - The user ID
 * @returns {Object} - The response object unified recipes
 */
const getUnifiedRecipes = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
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
      sort,
      sortDirection,
    } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}search-recipes${userId}$${isLogged}${language}${query}${limit}${type}${diet}${cuisine}${maxReadyTime}${sort}${sortDirection}`;
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
      userId,
      isLogged,
      sort,
      sortDirection,
    );
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get random recipes
 * @route   GET /api/spoonacular/recipes/random
 * @access  public
 * @param   {number} req.query.limit - Number of recipes to fetch
 * @param   {string} req.query.language - Language for the recipes
 * @param   {number} req.query.page - Page number for pagination
 * @param   {number} req.query.size - Size of the page for pagination
 * @param   {string} req.user.id - The user ID
 * @param   {boolean} req.user.isLogged - The user is logged in
 * @returns {Object} - The response object random recipes
 */
const getRandomRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { limit, language, page, size } = req.query;

    const userId = req.user.id;
    const isLogged = req.user.isLogged;

    const recipes = await fetchRandomRecipes(limit, language, userId, isLogged);
    const pagineRandomRecipes = paginateArray(recipes, page, size);
    res.status(200).json(pagineRandomRecipes);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/**
 * @desc    Get recipe information by ID
 * @route   GET /api/spoonacular/recipes/:id
 * @access  public
 * @param   {Object} req - Express request object
 * @param   {string} req.params - Recipe ID
 * @param   {string} req.query.language - Language for the recipes
 * @param   {string} req.query.currency - Currency for recipe pricing
 * @param   {string} req.user.id - The user ID
 * @param  {boolean} req.user.isLogged - The user is logged in
 * @returns {Object} - The response object inforamation about recipe
 */
const getInformationById = asyncHandler(async (req, res, next) => {
  try {
    const recipeId = req.params.id;
    const { language, currency } = req.query;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const recipe = await fetchInformationById(
      recipeId,
      language,
      currency,
      userId,
      isLogged,
    );
    res.status(200).json(recipe);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/**
 * @desc    Get recommended recipes
 * @route   GET /api/spoonacular/recipes/recommended/:recipeId
 * @access  public
 * @param   {string} req.params - Recipe ID
 * @param   {string} req.query.language - Language for the recipes
 * @param   {string} req.query.currency - Currency for recipe pricing
 * @param   {number} req.query.page - Page number for pagination
 * @param   {number} req.query.size - Size of the page for pagination
 * @param   {boolean} req.user.isLogged - The user is logged in
 * @param   {string} req.user.id - The user ID
 * @returns {Object} - The response object recommended recipes
 */
const getRecommendedRecipes = asyncHandler(async (req, res, next) => {
  try {
    const recipeId = req.params.id;
    const isLogged = req.user.isLogged;
    const userId = req.user.id;
    const { language, currency, page, size } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}recomended-recipes${recipeId}${language}${currency}${userId}${isLogged}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRecommendedRecipes,
      recipeId,
      language,
      currency,
      userId,
      isLogged,
    );
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get favourite recipes
 * @route   GET /api/spoonacular/recipes/favourite
 * @access  private
 * @param   {string} req.query.language - Language for the recipes
 * @param   {string} req.user.id -  User ID
 * @param   {string} req.query.currency - Currency for recipe pricing
 * @param   {number} req.query.page - Page number for pagination
 * @param   {number} req.query.size - Size of the page for pagination
 * @returns {Object} - The response object favourite recipes
 */
const getFavouriteRecipes = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { language, page, size, currency } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}favourite-recipes${userId}${language}${currency}`;

    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchFavoriteRecipes,
      userId,
      language,
      currency,
    );
    res.status(200).json(recipes);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/**
 * @desc    Get recipes by ingredients
 * @route   GET /api/spoonacular/recipes/ingredients
 * @access  public
 * @param   {string} req.query.ingredients - Ingredients for the recipes search format (plus separated)
 * @param   {number} req.query.number - Number of recipes to fetch
 * @param   {string} req.query.language - Language for the recipes
 * @param   {number} req.query.page - Page number for pagination
 * @param   {number} req.query.size - Size of the page for pagination
 * @param   {string} req.user.id - The user ID
 * @param   {boolean} req.user.isLogged - The user is logged in
 * @returns {Object} - The response object recipes by ingredients
 */
const getRecipesByIngridients = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    const { ingredients, number, language, page, size } = req.query;

    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}searchByIngredients-recipes${userId}${isLogged}${language}${number}${ingredients}`;

    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      fetchRecipesByIngredients,
      number,
      language,
      userId,
      isLogged,
      ingredients,
    );
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Get translated recipes
 * @route   GET /api/spoonacular/recipes/translate
 * @access  public
 * @param   {string} req.query.language - Language for the recipes
 * @param   {number} req.query.page - Page number for pagination
 * @param   {number} req.query.size - Size of the page for pagination
 * @param   {Object} req.body - The recipes to translate
 * @returns {Object} - The response object translated recipes
 */
const translateRecipe = asyncHandler(async (req, res, next) => {
  try {
    const { language, page, size } = req.query;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];

    const redisKey = `${clientIp}translate-recipes$${language}${page}${size}`;
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
  getUnifiedRecipes,
  getRandomRecipes,
  getInformationById,
  getRecommendedRecipes,
  getFavouriteRecipes,
  getRecipesByIngridients,
  translateRecipe,
};
