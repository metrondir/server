const asyncHandler = require("express-async-handler");
const recipeService = require("../services/recipeService");
const multer = require("multer");
const { onDataChanged } = require("../middleware/paginateMiddleware");
// multer configuration for file upload
const {
  redisGetModelsWithPaginating,
} = require("../middleware/paginateMiddleware");
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

function parseNestedArray(arr) {
  if (!Array.isArray(arr)) {
    throw new Error("Expected an array");
  }

  return arr.map((item) => {
    if (Array.isArray(item)) {
      return parseNestedArray(item);
    } else {
      return JSON.parse(item).original;
    }
  });
}

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

const createCheckoutSession = asyncHandler(async (req, res, next) => {
  try {
    const session = await recipeService.createCheckoutSession(req);
    console.log(session.url);
    res.redirect(`${session.url}`);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

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
  createCheckoutSession,
  getAllPaymentRecipes,
  getRecipesCollection,
  getSesionsStatus,
};
