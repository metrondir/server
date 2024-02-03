const Recipe = require("../models/recipeModel");
const ApiError = require("../middleware/apiError");
const SpoonacularRecipeModel = require("../models/spoonacularRecipeModel");

const mongoose = require("mongoose");
const getRecipesFromDatabaseRandom = async (limit) => {
  return await Recipe.aggregate([{ $sample: { size: Math.floor(limit) } }]);
};

const getRecipesFromDatabaseRandomWithUsers = async (limit, userId) => {
  return await Recipe.aggregate([
    { $match: { user: { $ne: new mongoose.Types.ObjectId(userId) } } },
    { $sample: { size: Math.floor(limit) } },
  ]);
};

const getSpoonAcularChangedLikeRecipe = async () => {
  const recipes = await SpoonacularRecipeModel.find();
  return recipes;
};

const getRecipesByCategories = async (sortDirection, valueSort) => {
  let sortValue = sortDirection === "desc" ? -1 : 1;
  try {
    if (valueSort === "time") {
      valueSort = "readyInMinutes";
    } else if (valueSort === "popularity") {
      valueSort = "aggregateLikes";
    } else if (valueSort === "price") {
      valueSort = "pricePerServing";
    }
    const recipes = await Recipe.find().sort({ [valueSort]: sortValue });
    return recipes;
  } catch (error) {
    throw ApiError.BadRequest(error.message);
  }
};

const getRecipesFromDatabaseByIngridients = async (limit, ingredients) => {
  ingredients = ingredients.split(",");
  return await Recipe.aggregate([
    {
      $match: {
        extendedIngredients: { $elemMatch: { original: { $in: ingredients } } },
      },
    },
    { $sample: { size: Math.floor(limit / 2) } },
  ]);
};

const getRecipesFromDatabaseComplex = async (
  query,
  limit,
  type,
  diet,
  cuisine,
  maxReadyTime,
) => {
  const pipeline = [
    { $match: {} },
    { $sample: { size: Math.floor(limit / 2) } },
  ];
  if (query) {
    pipeline[0].$match.title = { $regex: new RegExp(query, "i") };
  }
  if (type) {
    pipeline[0].$match.dishTypes = type;
  }

  if (diet) {
    pipeline[0].$match.diets = diet;
  }

  if (cuisine) {
    pipeline[0].$match.cuisines = cuisine;
  }
  if (maxReadyTime) {
    pipeline[0].$match.readyInMinutes = { $lte: Number(maxReadyTime) };
  }
  try {
    const recipes = await Recipe.aggregate(pipeline);
    return recipes;
  } catch (error) {
    throw ApiError.BadRequest(error.message);
  }
};

module.exports = {
  getRecipesFromDatabaseRandomWithUsers,
  getRecipesFromDatabaseByIngridients,
  getRecipesFromDatabaseComplex,
  getRecipesByCategories,
  getSpoonAcularChangedLikeRecipe,
  getRecipesFromDatabaseRandom,
};
