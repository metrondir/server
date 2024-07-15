const Recipe = require("../models/recipeModel");
const SpoonacularRecipeModel = require("../models/spoonacularRecipeModel");
const mongoose = require("mongoose");

/**
 * @desc Get the recipes from the database randomly.
 * @param {number} limit // The limit of the query.
 * @param {string} userId - The id of the user.
 * @returns {Promise<Object>} The result of the query.
 */
const getRecipesFromDatabaseRandom = async (limit, userId) => {
  if (!userId)
    return await Recipe.aggregate([{ $sample: { size: Math.floor(limit) } }]);
  return await Recipe.aggregate([
    { $match: { user: { $ne: new mongoose.Types.ObjectId(userId) } } },
    { $sample: { size: Math.floor(limit) } },
  ]);
};

/**
 * @desc Get the recipes from spoonacular the database with the changed like recipe.
 * @param {number} limit - The limit of the query.
 * @param {string} sortDirection - The direction of the sort.
 * @returns {Promise<Object>} The result of the query.
 */
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

/**
 * @desc Get the recipes from the database with the given categories.
 * @param {string} sortDirection - The direction of the sort.
 * @param {string} valueSort - The value to sort by.
 * @param {string} query - The query to search by.
 * @returns {Promise<Object>} The result of the query.
 */
const getRecipesByCategories = async (sortDirection, valueSort, query) => {
  let sortValue = sortDirection === "desc" ? -1 : 1;
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
};

/**
 * @desc Get the recipes from the database with the given ingredients.
 * @param {number} limit - The limit of the query.
 * @param {string} ingredients - The ingredients to search by.
 * @returns {Promise<Object>} The result of the query.
 */
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

/**
 * @desc Get the recipes from the database with the given query.
 * @param {string} query - The query to search by.
 * @param {number} limit - The limit of the query.
 * @param {string} type - The type of the recipe.
 * @param {string} diet - The diet of the recipe.
 * @param {string} cuisine - The cuisine of the recipe.
 * @param {number} maxReadyTime - The max ready time of the recipe.
 * @param {string} sort - The value to sort by.
 * @param {string} sortDirection - The direction of the sort.
 * @returns {Promise<Object>} -The result of the query.
 */
const getRecipesFromDatabaseComplex = async (
  query,
  limit,
  type,
  diet,
  cuisine,
  maxReadyTime,
  sort,
  sortDirection,
) => {
  const pipeline = [{ $match: {} }, { $sample: { size: Math.floor(limit) } }];

  if (query && query !== "undefined" && query !== "") {
    pipeline[0].$match.title = { $regex: new RegExp(query, "i") };
  }
  if (type && type !== "undefined" && type !== "") {
    pipeline[0].$match.dishTypes = type;
  }
  if (diet && diet !== "undefined" && diet !== "") {
    pipeline[0].$match.diets = diet;
  }
  if (cuisine && cuisine !== "undefined" && cuisine !== "") {
    pipeline[0].$match.cuisines = cuisine;
  }
  if (maxReadyTime && maxReadyTime != "undefined" && maxReadyTime != "") {
    pipeline[0].$match.readyInMinutes = { $lte: Number(maxReadyTime) };
  }
  let recipes = await Recipe.aggregate(pipeline);
  if (sort && sortDirection) {
    const sortDirectionFactor = sortDirection === "desc" ? -1 : 1;
    recipes = recipes.sort((a, b) => {
      if (sort === "time") {
        return sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes);
      } else if (sort === "popularity") {
        return sortDirectionFactor * (a.aggregateLikes - b.aggregateLikes);
      } else if (sort === "price") {
        return sortDirectionFactor * (a.pricePerServing - b.pricePerServing);
      }
      return 0;
    });
  }
  return recipes;
};

/**
 * @desc Get the recipes from the database with similar title.
 * @param {string} title - The title to search by.
 * @param {string} recipeId - The id of the recipe.
 * @returns {Promise<Object>} The result of the query.
 */
const getRecipesFromDatabaseByTitle = async (title, recipeId) => {
  return await Recipe.find({
    title: { $regex: new RegExp(title, "i") },
    _id: { $ne: recipeId },
  });
};

module.exports = {
  getRecipesFromDatabaseByIngridients,
  getRecipesFromDatabaseComplex,
  getRecipesByCategories,
  getSpoonAcularChangedLikeRecipe,
  getRecipesFromDatabaseRandom,
  getRecipesFromDatabaseByTitle,
};
