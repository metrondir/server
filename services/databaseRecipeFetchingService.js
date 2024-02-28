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

const getSpoonAcularChangedLikeRecipe = async (limit, sortDirection) => {
  let query = SpoonacularRecipeModel.find();

  if (sortDirection === "asc") {
    query = query.sort({ aggregateLikes: 1 });
  } else if (sortDirection === "desc") {
    query = query.sort({ aggregateLikes: -1 });
  }

  if (limit) {
    query = query.limit(parseInt(limit, 10));
  }

  const recipes = await query.exec();
  return recipes;
};

const getRecipesByCategories = async (sortDirection, valueSort, query) => {
  let sortValue = sortDirection === "desc" ? -1 : 1;
  try {
    let queryObject = {};

    if (query && query !== "undefined" && query !== "") {
      queryObject.title = { $regex: new RegExp(query, "i") };
    }
    if (valueSort === "time") {
      valueSort = "readyInMinutes";
    } else if (valueSort === "popularity") {
      valueSort = "aggregateLikes";
    } else if (valueSort === "price") {
      valueSort = "pricePerServing";
    }
    const recipes = await Recipe.find(queryObject).sort({
      [valueSort]: sortValue,
    });

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
    { $sample: { size: Math.floor(limit) } },
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
  const pipeline = [{ $match: {} }, { $sample: { size: Math.floor(limit) } }];

  if (query !== "undefined" && query !== "") {
    pipeline[0].$match.title = { $regex: new RegExp(query, "i") };
  }
  if (type !== "undefined" && type !== "") {
    pipeline[0].$match.dishTypes = type;
  }

  if (diet !== "undefined" && diet !== "") {
    pipeline[0].$match.diets = diet;
  }

  if (cuisine !== "undefined" && cuisine !== "") {
    pipeline[0].$match.cuisines = cuisine;
  }
  if (maxReadyTime !== "undefined" && maxReadyTime !== "") {
    pipeline[0].$match.readyInMinutes = { $lte: Number(maxReadyTime) };
  }
  try {
    console.log(pipeline);
    const recipes = await Recipe.aggregate(pipeline);
    console.log(recipes);
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
