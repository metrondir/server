const asyncHandler = require("express-async-handler");
const recipeService = require("../services/recipeService");
const multer = require("multer");
const ApiError = require("../middleware/apiError");
const { paginateArray } = require("../middleware/paginateMiddleware");
// multer configuration for file upload

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
    const { page, size } = req.query;
    const recipes = await recipeService.getRecipes(req, res, next);
    paginateArray(recipes, page, size)(req, res, () => {
      const paginatedRecipes = res.locals.paginatedData;
      res.status(200).json(paginatedRecipes);
    });
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
      return res.status(201).json("Recipe created");
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
    return res.status(200).json("Recipe deleted");
  } catch (error) {
    next(error);
  }
});

const loadDataToSelect = asyncHandler(async (req, res, next) => {
  try {
    const { language } = req.query;
    const data = await recipeService.loadData(req, language);
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = {
  getRecipe,
  getRecipes,
  setFavoriteRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  loadDataToSelect,
};
