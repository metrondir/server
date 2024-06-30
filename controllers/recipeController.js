const asyncHandler = require("express-async-handler");
const recipeService = require("../services/recipeService");
const multer = require("multer");

// multer configuration for file upload
const {
  redisGetModelsWithPaginating,
  onDataChanged,
} = require("../services/redisService");
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

//@desc Get recipe
//@route GET /api/recipe:/id
//@access private

const getRecipe = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  try {
    const recipe = await recipeService.getRecipe(id);
    return res.status(200).json(recipe);
  } catch (error) {
    next(error);
  }
});

//@desc Get all recipes
//@route GET /api/recipe
//@access private

const getRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { page, size, language, currency } = req.query;
    const id = req.user.id;
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    const redisKey = `${clientIp}my-recipes${id}${language}${currency}`;

    const recipes = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getRecipes,
      currency,
      language,
      id,
    );

    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

//@desc Create new Favorite recipe
//@route GET /api/recipe/favourite/:id
//@access private

const setFavoriteRecipes = asyncHandler(async (req, res, next) => {
  try {
    await recipeService.setFavoriteRecipes(req);
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];

    onDataChanged(clientIp);
    return res.status(201).json("Favorite recipe created");
  } catch (error) {
    next(error);
  }
});

//@desc Create new recipe
//@route POST /api/recipe
//@access private

const createRecipe = [
  upload.single("image"),
  asyncHandler(async (req, res, next) => {
    try {
      await recipeService.createRecipe(req);
      const ipAddress =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      const clientIp = ipAddress.split(",")[0].concat("my-recipes");
      onDataChanged(clientIp);
      return res.status(201).json("Recipe created");
    } catch (error) {
      next(error);
    }
  }),
];

//@desc Update recipe
//@route PUT /api/recipe:/id
//@access private

const createRecipeByDraft = [
  upload.single("image"),
  asyncHandler(async (req, res, next) => {
    try {
      const ipAddress =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      const clientIp = ipAddress.split(",")[0].concat("my-recipes");
      await recipeService.createRecipeByDraft(req);
      onDataChanged(clientIp);
      return res.status(201).json("Recipe created By draft for 3 days");
    } catch (error) {
      next(error);
    }
  }),
];

//@desc Update recipe
//@route PUT /api/recipe:/id
//@access private

const updateRecipe = asyncHandler(async (req, res, next) => {
  try {
    const recipe = await recipeService.updateRecipe(req);
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    onDataChanged(clientIp);
    return res.status(200).json({ recipe, message: "Recipe updated" });
  } catch (error) {
    next(error);
  }
});

//@desc Delete recipe
//@route DELETE /api/recipe:/id
//@access private

const deleteRecipe = asyncHandler(async (req, res, next) => {
  try {
    await recipeService.deleteRecipe(req);
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const clientIp = ipAddress.split(",")[0];
    onDataChanged(clientIp);
    return res.status(200).json("Recipe deleted");
  } catch (error) {
    next(error);
  }
});
//@access load Data with language
//@desc Load data to select
//@route GET /api/recipe/loadDataToSelect
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
// @desc Load currency and languages
// @route GET /api/recipe/loadCurrencyAndLanguges
// @access public
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
// @desc Load ingredients
// @route GET /api/recipe/loadIngredients
// @access public
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
// @desc Create payment intent
// @route POST /api/recipe/create-payment-intent
// @access private
const createPaymentIntent = asyncHandler(async (req, res, next) => {
  try {
    const payment = await recipeService.createPaymentIntent(req, res);

    return res.status(200).json(payment);
  } catch (error) {
    console.log(error);
    next(error);
  }
});
// @desc Get all payment recipes
// @route GET /api/recipe/payment-recipes
// @access public
const getAllPaymentRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { page, size, language, currency } = req.query;
    const redisKey = `AllPaymentRecipes${language}${currency}`;
    const loadData = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getAllPaymentRecipes,
      req.user.id,
      language,
      currency,
    );
    return res.status(200).json(loadData);
  } catch (error) {
    console.log(error);
  }
});

// @desc Get recipes collection
// @route GET /api/recipe/collection
// @access public
const getRecipesCollection = asyncHandler(async (req, res, next) => {
  try {
    const { page, size, language, currency } = req.query;
    const redisKey = `RecipesCollection${language}${currency}`;
    const loadData = await redisGetModelsWithPaginating(
      page,
      redisKey,
      size,
      recipeService.getRecipesCollection,
      req,
    );
    return res.status(200).json(loadData);
  } catch (error) {
    console.log(error);
  }
});
// @desc Get sesions status
// @route GET /api/recipe/sesions-status
// @access public
const getSesionsStatus = asyncHandler(async (req, res, next) => {
  try {
    const session = await recipeService.getSesionsStatus(req);
    return res.status(200).json(session);
  } catch (error) {
    console.log(error);

    next(error);
  }
});

module.exports = {
  getRecipe,
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
