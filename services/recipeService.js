const Recipe = require("../models/recipeModel");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const SpoonacularRecipeModel = require("../models/spoonacularRecipeModel");
const imgur = require("imgur");
const fs = require("fs").promises;
const sharp = require("sharp");
const axios = require("axios");
const { changeCurrency } = require("./changeCurrencyRecipesService");
const {
  createInstructionsHTML,
} = require("../utils/createInstructionsLikeList");
const {
  parsedIngredients,
  fetchAggregateLikesById,
  fetchInformationById,
} = require("../services/recipesFetchingService");
const {
  detectLanguage,
  translateRecipePost,
  translateRecipeGet,
  TranslateRecipeInformation,
  translateText,
} = require("../services/translationService");
const { data } = require("../utils/recipesData");
const { currencyData } = require("../utils/currencyData");
const { languageData } = require("../utils/languageData");
const ApiError = require("../middleware/apiError");
const { response } = require("express");

const getRecipe = async (id) => {
  const data = await Recipe.findById(id);

  if (!data) {
    throw ApiError.BadRequest("Recipe not found");
  }
  return {
    id: data.id,
    title: data.title,
    image: data.image,
    diets: data.diets || [],
    instructions: data.instructions,
    extendedIngredients:
      data.extendedIngredients.map((ingredient) => ingredient.original) || [],
    pricePerServing: data.pricePerServing,
    readyInMinutes: data.readyInMinutes + " min",
    dishTypes: data.dishTypes || [],
  };
};

const getRecipes = async (currency, language, id) => {
  const recipes = await Recipe.find({ user: id });
  if (recipes.length === 0) return [];
  if (language === "en" || !language) {
    const updatedRecipes = recipes.map((recipe) => ({
      ...recipe._doc,
      extendedIngredients: recipe.extendedIngredients.map(
        (ingredient) => ingredient.original,
      ),
      pricePerServing: !currency
        ? recipe.pricePerServing + " USD"
        : recipe.pricePerServing,
      readyInMinutes: recipe.readyInMinutes + " min",
    }));
    if (currency) return changeCurrency(updatedRecipes, currency);

    return updatedRecipes;
  } else {
    const min = await translateText(" min", language);
    await Promise.all(
      recipes.map((recipe) => translateRecipeGet(recipe, language)),
    );
    const translatedRecipes = recipes.map((recipe) => ({
      id: recipe.id || recipe._id,
      title: recipe.title,
      image: recipe.image,
      extendedIngredients: recipe.extendedIngredients.map(
        (ingredient) => ingredient.original,
      ),
      pricePerServing: !currency
        ? recipe.pricePerServing + " USD"
        : recipe.pricePerServing,
      diets: recipe.diets || [],
      cuisines: recipe.cuisines || [],
      instructions: recipe.instructions,
      readyInMinutes: recipe.readyInMinutes + min,
      dishTypes: recipe.dishTypes || [],
    }));

    if (currency) return changeCurrency(translatedRecipes, currency);

    return translatedRecipes;
  }
};

const createRecipe = async (req) => {
  if (
    req.body.extendedIngredients &&
    typeof req.body.extendedIngredients === "string"
  ) {
    req.body.extendedIngredients = JSON.parse(req.body.extendedIngredients);
  }

  if (req.body.dishTypes && typeof req.body.dishTypes === "string") {
    req.body.dishTypes = JSON.parse(req.body.dishTypes).map(
      (dishtype) => dishtype.label,
    );
  }

  if (req.body.cuisines && typeof req.body.cuisines === "string") {
    req.body.cuisines = JSON.parse(req.body.cuisines).map(
      (cuisine) => cuisine.label,
    );
  }

  if (req.body.diets && typeof req.body.diets === "string") {
    req.body.diets = JSON.parse(req.body.diets).map((diet) => diet.label);
  }

  const image = await fs.readFile(req.file.path, {
    encoding: "base64",
  });

  const response = await axios({
    method: "POST",
    url: "https://detect.roboflow.com/food-ingredient-recognition-51ngf/4",
    params: {
      api_key: "6jm9qkQBt3xv4LmGk13g",
    },
    data: image,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (response.data.predictions.length === 0) {
    throw ApiError.BadRequest("Image is not a food");
  }

  const resizedImageBuffer = await sharp(req.file.path)
    .resize(556, 370)
    .toBuffer();
  const imgurResponse = await imgur.uploadBase64(
    resizedImageBuffer.toString("base64"),
  );
  const imgurLink = imgurResponse.link;

  const language = await detectLanguage(req.body.instructions);

  try {
    let recipe = await translateRecipePost(req.body, language);
    const cost = await parsedIngredients(recipe.extendedIngredients);
    recipe.pricePerServing = cost;
    recipe.image = imgurLink;
    recipe.user = req.user.id;
    recipe.instructions = createInstructionsHTML(recipe.instructions);
    recipe = new Recipe(recipe);
    await recipe.save();
    return recipe;
  } catch (error) {
    console.log(error.message);
    throw ApiError.BadRequest(error.message);
  }
};

const setFavoriteRecipes = async (req) => {
  try {
    const recipeId = req.params.id;

    const existingFavoriteRecipe = await FavoriteRecipe.findOne({
      recipe: recipeId,
      user: req.user.id,
    });
    const existedSpoonacularRecipe = await SpoonacularRecipeModel.findOne({
      id: recipeId,
    });

    if (existingFavoriteRecipe) {
      const deletedFavoriteRecipe = await deleteFavoriteRecipe(
        existingFavoriteRecipe,
        recipeId,
        existedSpoonacularRecipe,
      );
      await FavoriteRecipe.updateMany(
        { recipe: { $in: recipeId } },
        { $inc: { aggregateLikes: -1 } },
      );
      return { isDeleted: true, data: deletedFavoriteRecipe };
    }

    const recipe = await fetchInformationById(recipeId, "en", null);
    let foundAggLike;
    if (recipeId.length <= 8) {
      foundAggLike = await SpoonacularRecipeModel.find({ id: recipeId });
    }

    if (recipeId.length >= 9) {
      foundAggLike = await Recipe.find({ _id: recipeId });
    }

    await FavoriteRecipe.updateMany(
      { recipe: { $in: recipeId } },
      { $inc: { aggregateLikes: +1 } },
    );
    const newFavoriteRecipe = new FavoriteRecipe({
      recipeId: recipe.id,
      title: recipe.title,
      extendedIngredients: recipe.extendedIngredients,
      pricePerServing: recipe.pricePerServing,
      cuisines: recipe.cuisines,
      dishTypes: recipe.dishTypes,
      instructions: Array.isArray(recipe.instructions)
        ? recipe.instructions.join("\n")
        : typeof recipe.instructions === "string"
          ? recipe.instructions
          : undefined,
      aggregateLikes:
        foundAggLike.length !== 0
          ? foundAggLike[0].aggregateLikes + 1
          : recipe.aggregateLikes,
      diets: recipe.diets,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      user: req.user.id,
      recipe: recipeId,
    });
    await newFavoriteRecipe.save();

    await updateRecipeLikes(recipeId, existedSpoonacularRecipe);

    return { isDeleted: false, data: newFavoriteRecipe };
  } catch (error) {
    console.error(error);
    throw ApiError.BadRequest("Recipe not found");
  }
};

const deleteFavoriteRecipe = async (
  existingFavoriteRecipe,
  recipeId,
  existedSpoonacularRecipe,
) => {
  const deletedFavoriteRecipe = await FavoriteRecipe.findByIdAndDelete(
    existingFavoriteRecipe._id,
  );
  if (recipeId >= 8) {
    await updateSpoonacularRecipeLikes(existedSpoonacularRecipe, recipeId, -1);
  } else {
    await updateRecipeLikes(recipeId, null, -1);
  }

  return deletedFavoriteRecipe;
};

const updateRecipeLikes = async (
  recipeId,
  existedSpoonacularRecipe,
  likesDelta = 1,
) => {
  if (recipeId >= 8) {
    await updateSpoonacularRecipeLikes(
      existedSpoonacularRecipe,
      recipeId,
      likesDelta,
    );
  } else {
    const recipe = await Recipe.findById(recipeId);
    recipe.aggregateLikes += likesDelta;
    await recipe.save();
  }
};

const updateSpoonacularRecipeLikes = async (
  existedSpoonacularRecipe,
  recipeId,
  likesDelta,
) => {
  if (existedSpoonacularRecipe) {
    existedSpoonacularRecipe.aggregateLikes += likesDelta;
    await existedSpoonacularRecipe.save();
  } else {
    const likes = await fetchAggregateLikesById(recipeId);

    const spoonacularRecipe = new SpoonacularRecipeModel({
      id: recipeId,
      aggregateLikes: likes.aggregateLikes + likesDelta,
    });
    await spoonacularRecipe.save();
  }
};

const updateRecipe = async (req) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) {
    throw ApiError.BadRequest("Recipe not found");
  }

  if (
    req.body.extendedIngredients &&
    typeof req.body.extendedIngredients === "string"
  ) {
    let parsedIngredients = JSON.parse(req.body.extendedIngredients);
    req.body.extendedIngredients = parsedIngredients;
  }

  if (req.file) {
    const imgurLink = await imgur.uploadFile(req.file.path);
    req.body.image = imgurLink.link;
  }
  const updatedRecipe = await Recipe.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true },
  );
  await updatedRecipe.save();

  return updatedRecipe;
};

const deleteRecipe = async (req) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) {
    throw ApiError.BadRequest("Recipe not found");
  }
  await Recipe.deleteOne({ id: req.params.id });

  return recipe;
};

const loadData = async (language) => {
  if (language === "en" || language === undefined) {
    return data;
  }
  const translatedData = await TranslateRecipeInformation(data, language);

  return translatedData;
};

const getCurrencyAndLanguges = async () => {
  const result = {
    languageData: languageData.languageData,
    currencyData: currencyData.currencyData,
  };

  return result;
};

const getIngredients = async () => {
  let ingredients;
  try {
    const fileContent = await fs.readFile(
      "./utils/top-1k-ingredients.txt",
      "utf-8",
    );

    ingredients = fileContent.split("\r\n");
  } catch (error) {
    console.error("Error reading file:", error);
    return [];
  }

  return ingredients;
};

module.exports = {
  getRecipe,
  getRecipes,
  setFavoriteRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  loadData,
  getCurrencyAndLanguges,
  getIngredients,
};
