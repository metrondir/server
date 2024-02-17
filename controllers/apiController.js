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
const { paginateArray } = require("../middleware/paginateMiddleware");
const getRecipes = asyncHandler(async (req, res, next) => {
  try {
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
    } = req.query;

    const recipes = await fetchRecipes(
      query,
      limit,
      type,
      diet,
      cuisine,
      maxReadyTime,
      language,
    );
    paginateArray(recipes, page, size)(req, res, () => {
      const paginatedRecipes = res.locals.paginatedData;
      res.status(200).json(paginatedRecipes);
    });
  } catch (error) {
    next(error);
  }
});

const getRandomRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { limit, language, page, size } = req.query;

    const { refreshToken } = req.cookies;

    const recipes = await fetchRandomRecipes(limit, language, refreshToken);
    paginateArray(recipes, page, size)(req, res, () => {
      const paginatedRecipes = res.locals.paginatedData;
      res.status(200).json(paginatedRecipes);
    });
  } catch (error) {
    next(error);
  }
});

const getInformationById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language } = req.query;
    const recipes = await fetchInformationById(id, language);
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

const getRecommendedRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language } = req.query;

    const recipes = await fetchRecommendedRecipes(id, language);
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

const getFavouriteRecipes = asyncHandler(async (req, res, next) => {
  try {
    const id = req.user.id;
    const { language, page, size } = req.query;
    const recipes = await fetchFavoriteRecipes(id, language);
    paginateArray(recipes, page, size)(req, res, () => {
      const paginatedRecipes = res.locals.paginatedData;
      res.status(200).json(paginatedRecipes);
    });
  } catch (error) {
    next(error);
  }
});

const getRecipesByIngridients = asyncHandler(async (req, res, next) => {
  try {
    const { ingredients, number, language, page, size } = req.query;
    const recipes = await fetchRecipesByIngredients(
      ingredients,
      number,
      language,
    );
    paginateArray(recipes, page, size)(req, res, () => {
      const paginatedRecipes = res.locals.paginatedData;
      res.status(200).json(paginatedRecipes);
    });
  } catch (error) {
    next(error);
  }
});

const translateRecipe = asyncHandler(async (req, res, next) => {
  try {
    const { language, page, size } = req.query;
    const recipes = await translateRecipeInformation(req.body, language);
    paginateArray(recipes, page, size)(req, res, () => {
      const paginatedRecipes = res.locals.paginatedData;
      res.status(200).json(paginatedRecipes);
    });
  } catch (error) {
    next(error);
  }
});

const getRecipesByCategories = asyncHandler(async (req, res, next) => {
  try {
    const { limit, sort, sortDirection, language, page, size } = req.query;
    const recipes = await fetchRecipesByCategories(
      limit,
      sort,
      sortDirection,
      language,
    );

    paginateArray(recipes, page, size)(req, res, () => {
      const paginatedRecipes = res.locals.paginatedData;
      res.status(200).json(paginatedRecipes);
    });
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
