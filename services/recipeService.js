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
  changeCurrencyPrice,
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
} = require("./redisService");
const { languageData } = require("../utils/languageData");
const ApiError = require("../middleware/apiError");

const getRecipes = async (currency, language, id) => {
  const [recipesDraft, recipeFromDb] = await Promise.all([
    getRecipesFromUserIdFromRedis(id),
    Recipe.find({ user: id }),
  ]);

  let recipes = recipesDraft ? recipeFromDb.concat(recipesDraft) : recipeFromDb;

  if (recipes.length === 0) return [];

  const transformRecipe = (recipe, language, currency, minSuffix) => ({
    id: recipe?.id || recipe._id,
    title: recipe?.title,
    image: recipe?.image,
    extendedIngredients: recipe?.extendedIngredients.map(
      (ingredient) => ingredient.original,
    ),
    pricePerServing: !currency
      ? `${recipe?.pricePerServing} USD`
      : recipe?.pricePerServing,
    readyInMinutes: !recipe.readyInMinutes
      ? undefined
      : recipe?.readyInMinutes + minSuffix,
    diets: recipe?.diets || [],
    cuisines: recipe?.cuisines || [],
    instructions: recipe?.instructions,
    paymentInfo: {
      paymentStatus: recipe?.paymentInfo?.paymentStatus,
      price: recipe?.paymentInfo?.price,
      paymentMethod: recipe?.paymentInfo?.paymentMethod,
    },
    dishTypes: recipe?.dishTypes || [],
  });

  if (language == "en" || !language) {
    const minSuffix = " min";
    let updatedRecipes = recipes.map((recipe) =>
      transformRecipe(recipe, language, currency, minSuffix),
    );

    if (currency) {
      updatedRecipes = await changeCurrency(updatedRecipes, currency);
    }

    return updatedRecipes;
  } else {
    const minSuffix = await translateText(" min", language);

    await Promise.all(
      recipes.map((recipe) => translateRecipeGet(recipe, language)),
    );

    let translatedRecipes = recipes.map((recipe) =>
      transformRecipe(recipe, language, currency, minSuffix),
    );

    if (currency) {
      translatedRecipes = await changeCurrency(translatedRecipes, currency);
    }

    return translatedRecipes;
  }
};

const createRecipe = async (req) => {
  try {
    const processedBody = processRequestBody(req.body);
    const imageBase64 = await readImageAsBase64(req.file.path);
    const detectedIngredients = await detectFoodIngredients(imageBase64);
    if (detectedIngredients.length === 0) {
      throw ApiError.BadRequest("Image is not a food");
    }

    const imgurLink = await uploadToImgur(req.file.path);
    const language = await detectLanguage(processedBody.instructions);
    const user = await User.findById(req.user.id);

    let recipe = await translateRecipePost(processedBody, language);
    recipe.pricePerServing = await parsedIngredients(
      recipe.extendedIngredients,
    );
    recipe.image = imgurLink;
    recipe.user = req.user.id;

    await handlePaymentInfo(req.body, user, recipe);

    recipe.instructions = createInstructionsHTML(recipe.instructions);
    recipe = new Recipe(recipe);
    await recipe.save();

    if (req.body.price) {
      user.boughtRecipes.push(recipe._id);
      await user.save();
    }

    return recipe;
  } catch (error) {
    console.error(error.message);
    throw ApiError.BadRequest(error.message);
  }
};

const processRequestBody = (body) => {
  const parseJsonField = (field) =>
    typeof field === "string" ? JSON.parse(field) : field;

  return {
    ...body,
    extendedIngredients: parseJsonField(body.extendedIngredients),
    dishTypes: parseJsonField(body.dishTypes)?.map((dt) => dt.label),
    cuisines: parseJsonField(body.cuisines)?.map((c) => c.label),
    diets: parseJsonField(body.diets)?.map((d) => d.label),
  };
};

const readImageAsBase64 = async (path) => {
  const imageBuffer = await fs.readFile(path);
  return imageBuffer.toString("base64");
};

const detectFoodIngredients = async (imageBase64) => {
  const response = await axios.post(
    "https://detect.roboflow.com/food-ingredient-recognition-51ngf/4",
    imageBase64,
    {
      params: { api_key: "6jm9qkQBt3xv4LmGk13g" },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  return response.data.predictions;
};

const uploadToImgur = async (path) => {
  const resizedImageBuffer = await sharp(path).resize(556, 370).toBuffer();
  const imgurResponse = await imgur.uploadBase64(
    resizedImageBuffer.toString("base64"),
  );
  return imgurResponse.link;
};

const handlePaymentInfo = async (body, user, recipe) => {
  if (body.price) {
    recipe.paymentInfo = {
      paymentStatus: false,
      price: body.price,
      paymentMethod: "card",
    };

    const customer = await stripe.customers.list({ email: user.email });
    if (customer.data.length !== 0) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      user.stripeAccountId = account.id;
    }
  }
};

const createRecipeByDraft = async (req) => {
  try {
    const processedBody = processRequestBody(req.body);
    const imgurLink = req.file
      ? await handleImageUpload(req.file.path)
      : undefined;
    const language = processedBody.instructions
      ? await detectLanguage(processedBody.instructions)
      : undefined;
    const user = await User.findById(req.user.id);

    let recipe = await translateRecipePost(processedBody, language);
    recipe.pricePerServing = recipe.extendedIngredients
      ? await calculateCost(recipe.extendedIngredients)
      : undefined;
    recipe.image = imgurLink;
    recipe.user = req.user.id;

    handlePaymentInfo(req.body, user, recipe);

    if (recipe.instructions) {
      recipe.instructions = createInstructionsHTML(recipe.instructions);
    }

    recipe = new Recipe(recipe);
    await recipe.save();

    if (req.body.stripeAccountId) {
      user.boughtRecipes.push(recipe._id);
      await user.save();
    }

    await storeRecipe(recipe);
    return recipe;
  } catch (error) {
    console.error(error.message);
    throw ApiError.BadRequest(error.message);
  }
};

const handleImageUpload = async (path) => {
  const imageBase64 = await readImageAsBase64(path);
  const detectedIngredients = await detectFoodIngredients(imageBase64);
  if (detectedIngredients.length === 0) {
    throw ApiError.BadRequest("Image is not a food");
  }

  const resizedImageBuffer = await sharp(path).resize(556, 370).toBuffer();
  const imgurResponse = await imgur.uploadBase64(
    resizedImageBuffer.toString("base64"),
  );
  return imgurResponse.link;
};

const getRecipesCollection = async (req) => {
  try {
    const [myRecipes, favoriteRecipes, user, allRecipes] = await Promise.all([
      Recipe.find({ user: req.user.id }).lean(),
      FavoriteRecipe.find({ user: req.user.id }).lean(),
      User.findById(req.user.id).lean(),
      Recipe.find({ "paymentInfo.paymentStatus": false }).lean(),
    ]);

    const updatedRecipes = updateRecipesWithDefaultInstructions(
      allRecipes,
      user,
    );

    const allData = [...myRecipes, ...favoriteRecipes, ...updatedRecipes];

    await translateRecipes(allData, req.query.language);
    if (req.query.currency) {
      await changeCurrency(allData, req.query.currency);
    }

    return allData;
  } catch (error) {
    console.error(error.message);
    throw ApiError.BadRequest("Error fetching recipes collection");
  }
};

const updateRecipesWithDefaultInstructions = (recipes, user) => {
  return recipes.map((recipe) => {
    if (!user.boughtRecipes.includes(recipe._id.toString())) {
      recipe.instructions = `<ol><li>Boil water in a large pot.</li><li>Add pasta to the boiling water.</li><li>Cook pasta according to package instructions until al dente.</li><li>Drain pasta in a colander.</li><li>Return pasta to the pot.</li><li>Add your favorite sauce and mix well.</li><li>Serve hot and enjoy!</li></ol>`;
      delete recipe.analyzedInstructions;
    }
    return recipe;
  });
};

const translateRecipes = async (recipes, language) => {
  if (language) {
    await Promise.all(
      recipes.map((recipe) => translateRecipeGet(recipe, language)),
    );
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
    let instructions;
    if (Array.isArray(recipe.instructions)) {
      instructions = recipe.instructions.join("\n");
    } else if (typeof recipe.instructions === "string") {
      instructions = recipe.instructions;
    } else {
      instructions = undefined;
    }

    const newFavoriteRecipe = new FavoriteRecipe({
      recipeId: recipe.id,
      title: recipe.title,
      extendedIngredients: recipe.extendedIngredients,
      pricePerServing: recipe.pricePerServing,
      cuisines: recipe.cuisines,
      dishTypes: recipe.dishTypes,
      instructions: instructions,
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
  if (language == "en" || language == undefined) {
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

const createPaymentIntent = async (req, res) => {
  try {
    const { recipeId } = req.body;
    let { currency } = req.query;

    const currencyMap = {
      ua: "uah",
      cz: "czk",
      europeanunion: "eur",
      gb: "gbp",
      nz: "nzd",
      pl: "pln",
      jp: "jpy",
      ec: "usd",
    };
    const recipe = await Recipe.findById(recipeId.toString());
    const price = changeCurrencyPrice(recipe.paymentInfo.price, currency);
    currency = currencyMap[currency] || currency;

    const validCurrencies = [
      "uah",
      "czk",
      "eur",
      "gbp",
      "nzd",
      "pln",
      "jpy",
      "usd",
    ];

    if (currency && !validCurrencies.includes(currency)) {
      throw ApiError.BadRequest("Invalid currency code");
    }

    const user = await User.findById(recipe.user);
    if (!user) {
      throw ApiError.BadRequest("User not found");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price * 100,
      currency: currency || "usd",
      transfer_data: {
        destination: user.stripeAccountId,
      },
      metadata: {
        userId: req.user.id,
        recipeId: recipeId,
      },
    });

    return paymentIntent.client_secret;
  } catch (error) {
    return error;
  }
};

const getSesionsStatus = async (req) => {
  const event = req.body;
  let received = false;
  switch (event?.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event?.data?.object;
      const user = await User.findById(event?.data?.object?.metadata?.userId);
      user?.boughtRecipes?.push(paymentIntent?.metadata?.recipeId);
      await user?.save();
      received = true;
      break;
    }
    case "payment_intent.payment_failed": {
      let intent = event?.data?.object;
      const message = intent?.last_payment_error?.message;
      console.log("Failed:", intent?.id, message);

      break;
    }
    default:
      console.log(`Unhandled event type ${event?.type}`);
  }
  return { received };
};

const getAllPaymentRecipes = async (id, language, currency) => {
  try {
    const user = await User.findById(id).lean();
    const recipes = await Recipe.find({
      "paymentInfo.paymentStatus": true,
    }).lean();

    const updatedRecipes = updateRecipesWithDefaultInstructions(recipes, user);
    await translateRecipes(updatedRecipes, language);
    await formatRecipePrices(updatedRecipes, currency);

    return updatedRecipes;
  } catch (error) {
    console.error(error.message);
    throw ApiError.BadRequest("Error fetching payment recipes");
  }
};

const formatRecipePrices = async (recipes, currency) => {
  if (currency) {
    await Promise.all(
      recipes.map((recipe) => changeCurrency(recipe, currency)),
    );
  } else {
    recipes.forEach((recipe) => {
      recipe.pricePerServing = `${recipe.pricePerServing} USD`;
      if (recipe.paymentInfo?.price) {
        recipe.paymentInfo.price = `${recipe.paymentInfo.price} USD`;
      }
    });
  }
};

module.exports = {
  getRecipes,
  setFavoriteRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  loadData,
  getCurrencyAndLanguges,
  getIngredients,
  createRecipeByDraft,
  createPaymentIntent,
  getAllPaymentRecipes,
  getRecipesCollection,
  getSesionsStatus,
};
