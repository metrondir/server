const asyncHandler = require("express-async-handler");
const recipeService = require("../services/recipeService");
const multer = require("multer");

// multer configuration for file upload
const {
  redisGetModelsWithPaginating,
  onDataChanged,
} = require("../services/redisService");
const ApiError = require("../middleware/apiError");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname,
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
});

/**
 * @desc Get a recipes
 * @route GET /api/recipes
 * @access private
 * @param {string} req.query.page - The page number
 * @param {string} req.query.size - The size of the page
 * @param {string} req.query.language - The language of the data
 * @param {string} req.query.currency - The currency of the data
 * @param {string} req.user.id - The id of the user
 * @returns {Object} The recipes
 */

const getRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { page, size, language, currency } = req.query;
    const userId = req.user.id;

    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}my-recipes${userId}${language}${currency}`;

    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getRecipes,
      currency,
      language,
      userId,
    );
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

/**
 * @desc Set  favorite recipe
 * @route Get /api/recipes/favourite:id
 * @access private
 * @param {boolean} req.user.isLogged - The user is logged
 * @param {string} req.params.id - The  id of the recipe
 * @param {string} req.user.id - The  id of the user
 * @returns {Promise<void>} - Favorite recipe created
 */
const setFavoriteRecipes = asyncHandler(async (req, res, next) => {
  try {
    const recipeId = req.params.id;
    const userId = req.user.id;
    const isLogged = req.user.isLogged;
    await recipeService.setFavoriteRecipes(recipeId, userId, isLogged);
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];

    await onDataChanged(clientIp);
    return res.status(201).json("Favorite recipe created");
  } catch (error) {
    next(error);
    console.log(error);
  }
});

/**
 * @desc Create a recipe route handler.
 * @route POST /api/recipes
 * @access private
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>}
 */
const createRecipe = [
  upload.single("image"),
  asyncHandler(async (req, res, next) => {
    try {
      await recipeService.createRecipe(req);

      const ipAddress =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      const clientIp = ipAddress.split(",")[0].concat("my-recipes");
      await onDataChanged(clientIp);

      return res.status(201).json("Recipe created");
    } catch (error) {
      next(error);
    }
  }),
];

/**
 * @desc Create recipe
 * @route POST /api/recipes/by-draft
 * @access private
 * @param {Object} req - The request object
 * @returns {Promise<void>} - Recipe created By draft for 3 days
 */
const createRecipeByDraft = [
  upload.single("image"),
  asyncHandler(async (req, res, next) => {
    try {
      const ipAddress =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      const clientIp = ipAddress.split(",")[0].concat("my-recipes");
      await recipeService.createRecipeByDraft(req);
      await onDataChanged(clientIp);
      return res.status(201).json("Recipe created By draft for 3 days");
    } catch (error) {
      next(error);
    }
  }),
];

/**
 * @desc Update recipe
 * @route PUT /api/recipes/by-draft
 * @access private
 * @param {Object} req - The request object
 * @returns {Promise<Object>} - The updated recipe and message Recipe updated
 */
const updateRecipe = asyncHandler(async (req, res, next) => {
  try {
    const recipe = await recipeService.updateRecipe(req);
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    await onDataChanged(clientIp);
    return res.status(200).json({ recipe, message: "Recipe updated" });
  } catch (error) {
    next(error);
  }
});

/**
 * @desc Delete recipe
 * @route DELETE /api/recipes/:id
 * @access private
 * @param {string} req.query.id - The id of the recipe
 * @param {string} req.user.id - The id of the user
 * @returns {string}  -  Recipe deleted
 */
const deleteRecipe = asyncHandler(async (req, res, next) => {
  try {
    const recipeId = req.query.id;
    const userId = req.user.id;
    await recipeService.deleteRecipe(recipeId, userId);
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    await onDataChanged(clientIp);
    return res.status(200).json("Recipe deleted");
  } catch (error) {
    next(error);
  }
});

/**
 * @desc  Load data to select
 * @route GET /api/recipes/data
 * @access public
 * @param {string} req.query.language - The language of the data
 * @param {string} req.query.page - The page number
 * @param {string} req.query.size - The size of the page
 * @returns {Object}  - Recipe dishes, types and cuisines
 */
const loadDataToSelect = asyncHandler(async (req, res, next) => {
  try {
    const { language, page, size } = req.query;
    const redisKey = `dietsDishTypeCuisines${language}`;
    const data = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.loadData,
      language,
    );
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * @desc  Load curency&languages
 * @route GET /api/recipes/load-currency-languages
 * @access public
 * @param {string} req.query.page - The page number
 * @param {string} req.query.size - The size of the page
 * @returns {Object}  - Currency and languages
 */
const loadCurrencyAndLanguges = asyncHandler(async (req, res, next) => {
  try {
    const { page, size } = req.query;
    const redisKey = `CurrencyAndLanguages`;
    const loadData = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getCurrencyAndLanguges,
    );
    return res.status(200).json(loadData);
  } catch (error) {
    next(error);
  }
});

/**
 * @desc  Load ingredients
 * @route GET /api/recipes/load-ingredients
 * @access public
 * @param {string} req.query.page - The page number
 * @param {string} req.query.size - The size of the page
 * @returns {Object}  - Ingredients
 */
const loadIngredients = asyncHandler(async (req, res, next) => {
  try {
    const { page, size } = req.query;
    const redisKey = `LoadTop1000Ingredients`;
    const loadData = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getIngredients,
    );
    return res.status(200).json(loadData);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/**
 * @desc  create payment intent
 * @route GET /api/recipes/load-ingredients
 * @access public
 * @param {string} req.body.recipeId - The recipe id
 * @param {string} req.query.currency - The currency of the data
 * @param {string} req.user.id - The id of the user
 * @returns {Promise<Object>}  - Payment intent
 */
const createPaymentIntent = asyncHandler(async (req, res, next) => {
  try {
    const recipeId = req.body.recipeId;
    const currency = req.query.currency;
    const userId = req.user.id;
    const payment = await recipeService.createPaymentIntent(
      recipeId,
      userId,
      currency,
    );

    return res.status(200).json(payment);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/**
 * @desc  get all payment recipes
 * @route GET /api/recipes/payment-recipes
 * @access public
 * @param {string} req.user.id - The id of the user
 * @param {number} req.query.page - The page number
 * @param {number} req.query.size - The size number
 * @param {string} req.query.language - The language of the data
 * @param {string} req.query.currency - The currency of the data
 * @returns {Object}  - Payment recipes
 */
const getAllPaymentRecipes = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, size, language, currency } = req.query;
    const redisKey = `AllPaymentRecipes${language}${currency}${userId}${page}${size}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getAllPaymentRecipes,
      userId,
      language,
      currency,
    );
    return res.status(200).json(recipes);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/**
 * @desc  get all recipes collection
 * @route GET /api/recipes/collection
 * @access public
 * @param {string} req.user.id - The id of the user
 * @param {number} req.query.page - The page number
 * @param {number} req.query.size - The size number
 * @param {string} req.query.language - The language of the data
 * @param {string} req.query.currency - The currency of the data
 * @returns {Object}  - Recipes collection
 */
const getRecipesCollection = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, size, language, currency } = req.query;
    const redisKey = `RecipesCollection${language}${currency}${userId}${page}${size}`;
    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getRecipesCollection,
      userId,
      language,
      currency,
    );
    return res.status(200).json(recipes);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

/**
 * @desc  get sesions status
 * @route GET /api/recipes/webhooks
 * @access public
 * @param {Object} req.body.event - The event of the user payment session
 * @returns {Promise<Object>}  - Session status
 */
const getSesionsStatus = asyncHandler(async (req, res, next) => {
  try {
    const { metadata } = req.body.data.object;
    const { type } = req.body;
    const session = await recipeService.getSesionsStatus(type, metadata);
    return res.status(200).json(session);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

module.exports = {
  getRecipes,
  setFavoriteRecipes,
  createRecipe,
  createRecipeByDraft,
  updateRecipe,
  deleteRecipe,
  loadDataToSelect,
  loadCurrencyAndLanguges,
  loadIngredients,
  createPaymentIntent,
  getAllPaymentRecipes,
  getRecipesCollection,
  getSesionsStatus,
};
