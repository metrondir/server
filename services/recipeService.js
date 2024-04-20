const Recipe = require("../models/recipeModel");
const User = require("../models/userModel");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const SpoonacularRecipeModel = require("../models/spoonacularRecipeModel");
const imgur = require("imgur");
const fs = require("fs").promises;
const sharp = require("sharp");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const {
  changeCurrency,
  changeCurrencyForPayment,
} = require("./changeCurrencyRecipesService");
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
const {
  storeRecipe,
  getRecipesFromUserIdFromRedis,
} = require("../middleware/paginateMiddleware");
const { languageData } = require("../utils/languageData");
const ApiError = require("../middleware/apiError");

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
  const recipesDraft = await getRecipesFromUserIdFromRedis(id);
  console.log(recipesDraft);

  const recipe = await Recipe.find({ user: id });
  let recipes = [];
  if (!recipesDraft) {
    recipes = recipe;
  } else {
    recipes = recipe.concat(recipesDraft);
  }
  if (recipes.length === 0) return [];
  if (language === "en" || !language) {
    const updatedRecipes = recipes.map((recipe) => ({
      ...recipe._doc,
      extendedIngredients: recipe?.extendedIngredients.map(
        (ingredient) => ingredient.original,
      ),
      pricePerServing: !currency
        ? recipe?.pricePerServing + " USD"
        : recipe?.pricePerServing,
      readyInMinutes: recipe?.readyInMinutes + " min",
    }));
    if (currency) return changeCurrency(updatedRecipes, currency);

    return updatedRecipes;
  } else {
    const min = await translateText(" min", language);
    await Promise.all(
      recipes.map((recipe) => translateRecipeGet(recipe, language)),
    );
    const translatedRecipes = recipes.map((recipe) => ({
      id: recipe?.id || recipe._id,
      title: recipe?.title,
      image: recipe?.image,
      extendedIngredients: recipe?.extendedIngredients.map(
        (ingredient) => ingredient.original,
      ),
      pricePerServing: !currency
        ? recipe?.pricePerServing + " USD"
        : recipe?.pricePerServing,
      diets: recipe?.diets || [],
      cuisines: recipe?.cuisines || [],
      instructions: recipe?.instructions,
      readyInMinutes: recipe?.readyInMinutes + min,
      dishTypes: recipe?.dishTypes || [],
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
  const user = await User.findById(req.user.id);
  try {
    let recipe = await translateRecipePost(req.body, language);
    const cost = await parsedIngredients(recipe.extendedIngredients);
    recipe.pricePerServing = cost;
    recipe.image = imgurLink;
    recipe.user = req.user.id;

    recipe.user = req.user.id;
    if (!recipe.paymentInfo) {
      recipe.paymentInfo = {};
    }

    if (req.body.stripeAccountId) {
      recipe.paymentInfo.paymentStatus = true;
      recipe.paymentInfo.price = req.body.price;
      recipe.paymentInfo.paymentMethod = "card";
      user.stripeAccountId = req.body.stripeAccountId;
    }
    recipe.instructions = createInstructionsHTML(recipe.instructions);
    recipe = new Recipe(recipe);
    await recipe.save();
    await user.save();
    return recipe;
  } catch (error) {
    console.log(error.message);
    throw ApiError.BadRequest(error.message);
  }
};

const createRecipeByDraft = async (req) => {
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
    if (!recipe.paymentInfo) {
      recipe.paymentInfo = {};
    }
    if (req.body.paymentStatus) {
      recipe.paymentInfo.paymentStatus = req.body.paymentStatus;
      recipe.paymentInfo.currency = req.body.currency;
      recipe.paymentInfo.price = req.body.price;
      recipe.paymentInfo.paymentMethod = req.body.paymentMethod;
    }
    recipe.user = req.user.id;
    recipe.instructions = createInstructionsHTML(recipe.instructions);
    await storeRecipe(recipe);
    return recipe;
  } catch (error) {
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

    const recipe = await fetchInformationById(
      recipeId,
      "en",
      null,
      req.cookies.refreshToken,
    );
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

const createCheckoutSession = async (req) => {
  try {
    let currency = req.query.currency;
    const currencyName = await CurrencyModel.findOne({ lan: currency });
    currency = currencyName.name;
    if (currency !== "USD" || !currency) {
      req.body.price = await changeCurrencyForPayment(req.body.id, currency);
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: req.body.title,
              images: [req.body.image],
            },
            unit_amount: req.body.price * 100,
          },
          quantity: 1,
        },
      ],

      mode: "payment",
      success_url: `${process.env.API_URL}/recipes/${req.body.id}`,
      cancel_url: `${process.env.API_URL}`,
    });
    console.log(session);
    return session;
  } catch (error) {
    console.error(error);
    throw ApiError.BadRequest("Error creating checkout session");
  }
};
const getAllPaymentRecipes = async (id, language, currency) => {
  try {
    const user = await User.findById(id);
    const recipes = await Recipe.find({
      "paymentInfo.paymentStatus": true,
    }).lean();

    recipes.forEach((recipe) => {
      if (
        user.boughtRecipes.includes(recipe._id.toString()) &&
        user.boughtRecipes !== undefined
      ) {
      } else {
        delete recipe.instructions;
        delete recipe.analyzedInstructions;
        delete recipe.extendedIngredients;
      }
    });

    await Promise.all(
      recipes.map((recipe) => translateRecipeGet(recipe, language)),
    );
    if (currency)
      await Promise.all(
        recipes.map((recipe) => changeCurrency(recipe, currency)),
      );
    else {
      await Promise.all(
        recipes.map(
          (recipe) => (
            (recipe.pricePerServing = recipe.pricePerServing + " USD"),
            (recipe.paymentInfo.price = recipe.paymentInfo.price + " USD")
          ),
        ),
      );
    }

    return recipes;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

const paytoUser = async (req) => {
  const user = await User.findById(req.user.id);
  const recipe = await Recipe.findById(req.body.id);
  const transfer = await stripe.transfers.create({
    amount: req.body.price,
    currency: req.body.currency,
    destination: user.stripeAccountId,
    transfer_group: "recipe_payment",
  });
};

const checkCheckoutSession = async (req) => {
  const user = await User.findById(req.user.id);

  let event = request.body;
  if (endpointSecret) {
    const signature = request.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret,
      );
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log(
            `PaymentIntent for ${paymentIntent.amount} was successful!`,
          );
          user.boughtRecipes.push(paymentIntent.id);
          break;
        case "payment_method.attached":
          const paymentMethod = event.data.object;
          break;
        default:
          console.log(`Unhandled event type ${event.type}.`);
      }

      response.send();
    } catch (err) {
      console.error(`⚠️  Webhook signature verification failed.`);
      return response.sendStatus(400);
    }
  }
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
  createRecipeByDraft,
  createCheckoutSession,
  getAllPaymentRecipes,
};
