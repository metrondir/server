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

    const recipes = await fetchRecipes(
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
    //await redisGetModelsWithPaginating(recipes, page, size, req, res, next);
    //res.json(req.paginatedData);
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
    const { limit, language, page, size, currency } = req.query;

    const { refreshToken } = req.cookies;

    const recipes = await fetchRandomRecipes(
      limit,
      language,
      refreshToken,
      currency,
    );
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
    const { language, currency } = req.query;
    const recipes = await fetchInformationById(id, language, currency);
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

const getRecommendedRecipes = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language, currency } = req.query;

    const recipes = await fetchRecommendedRecipes(id, language, currency);
    res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
});

const getFavouriteRecipes = asyncHandler(async (req, res, next) => {
  try {
    const id = req.user.id;
    const { language, page, size, currency } = req.query;
    const recipes = await fetchFavoriteRecipes(id, language, currency);
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
    const { refreshToken } = req.cookies;
    const { ingredients, number, language, page, size, currency } = req.query;
    const recipes = await fetchRecipesByIngredients(
      ingredients,
      number,
      language,
      currency,
      refreshToken,
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
    const recipes = await fetchRecipesByCategories(
      query,
      limit,
      sort,
      sortDirection,
      language,
      currency,
      refreshToken,
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
