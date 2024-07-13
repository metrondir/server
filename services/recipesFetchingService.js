const axios = require("axios");
const { baseUrl, getApiKey } = require("../config/configApiHandler");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const User = require("../models/userModel");
const Recipe = require("../models/recipeModel");
const {
  translateText,
  translateRecipeInformation,
  detectLanguage,
  translateRecipeFavInformation,
} = require("./translationService");
const {
  getRecipesFromDatabaseRandom,
  getRecipesFromDatabaseByIngridients,
  getRecipesFromDatabaseComplex,
} = require("./databaseRecipeFetchingService");
const { changeCurrency } = require("./changeCurrencyRecipesService");
const {
  refactorInstructionbyHTML,
} = require("../utils/createInstructionsLikeList");
const ApiError = require("../middleware/apiError");
const { isSpoonacularRecipe } = require("../utils/repetetiveCondition");

/**
 * @desc Get a random sample from an array.
 * @param {Array} array - The array to get a random sample from.
 * @param {number} size - The size of the sample.
 * @returns {Array} The random sample.
 */
const getRandomSample = (array, size) => {
  const shuffled = array.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
};

/**
 * @desc Mark the recipes as favourites.
 * @param {Array} allRecipes - The array of recipes to mark as favourites.
 * @param {string} userId - The id of the user.
 * @returns {Promise<Object>} The array of recipes with the favourites marked.
 */
const markFavorites = async (allRecipes, userId) => {
  const favourites = await FavoriteRecipe.find({ user: userId });

  allRecipes.forEach((item) => {
    const recipeId = item?.id || item?._id?.toString();
    const isFavoriteRecipe = favourites.some((recipe) => {
      const recipeIdString = recipe?.recipe?.toString();
      return recipeIdString == recipeId;
    });

    item.isFavourite = isFavoriteRecipe;
  });

  return allRecipes;
};

/**
 * @desc Fetch the data of the recipes.
 * @param {Array} response - The array of recipes to fetch data from.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @returns {Promise<Array>} The array of recipes with the fetched data.
 */
const fetchRecipesData = async (response, language, currency) => {
  if (language == "en" || !language) {
    return response.map((recipe) => ({
      id: recipe.id || recipe._id,
      title: recipe.title,
      image: recipe.image,
      pricePerServing: recipe.pricePerServing,
      readyInMinutes: recipe.readyInMinutes + " min",
      dishTypes: recipe.dishTypes || [],
      isFavourite: recipe?.isFavourite,
      cuisines: recipe.cuisines || [],
      aggregateLikes: recipe?.aggregateLikes,
    }));
  }
  await Promise.all(
    response.map((recipe) => translateRecipeInformation(recipe, language)),
  );
  const translatedMin = await translateText("min", language);

  return response.map((recipe) => ({
    id: recipe.id || recipe._id,
    title: recipe.title,
    image: recipe.image,
    cuisines: recipe.cuisines || [],
    pricePerServing: pricePerServing,
    readyInMinutes:
      typeof recipe.readyInMinutes === "number"
        ? `${recipe.readyInMinutes} ${translatedMin}`
        : recipe.readyInMinutes,
    dishTypes: recipe.dishTypes || [],
    isFavourite: recipe?.isFavourite,
    aggregateLikes: recipe?.aggregateLikes,
  }));
};

/**
 * @desc Fetch the recipes by ingredients.
 * @param {number} number - The number of recipes to fetch.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {string} userId - The user id.
 * @param {boolean} isLogged - The User is logged.
 * @param {string} ingredients - The ingredients to search by.
 * @returns {Promise<Object} The array of recipes.
 */
const fetchRecipesByIngredients = async (
  number,
  language,
  currency,
  userId,
  isLogged,
  ingredients,
) => {
  const lanIngredients = await detectLanguage(ingredients);
  if (lanIngredients !== "en")
    ingredients = await translateText(ingredients, "en");
  const url = `${baseUrl}/findByIngredients?apiKey=${getApiKey()}&ingredients=${ingredients}&number=${number}&ignorePantry=true`;

  const response = await axios.get(url);

  const recipesFromDb = await getRecipesFromDatabaseByIngridients(
    number,
    ingredients,
  );

  const allRecipes = [...response.data, ...recipesFromDb];

  const RandomSample = getRandomSample(
    allRecipes,
    Math.floor(allRecipes.length),
  ).slice(0, number);
  if (isLogged) await markFavorites(RandomSample, userId);

  return Promise.all(
    RandomSample.map(async (recipe) =>
      fetchInformationByRecommended(
        recipe.id,
        language,
        currency,
        userId,
        isLogged,
      ),
    ).filter((recipe) => recipe !== undefined),
  );
};

/**
 * @desc Fetch the recipes unified.
 * @param {string} query - The query to search by.
 * @param {number} limit - The limit of the query.
 * @param {string} type - The type of the recipe.
 * @param {string} diet - The diet of the recipe.
 * @param {string} cuisine - The cuisine of the recipe.
 * @param {number} maxReadyTime - The max ready time of the recipe.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {string} userId - The user id.
 * @param {string} sort - The value to sort by.
 * @param {boolean} isLogged - The User is logged.
 * @param {string} userId - The id of the user.
 * @param {string} sortDirection - The direction of the sort.
 * @returns {Promise<Object>} The array of recipes.
 */
const fetchRecipesUnified = async (
  query,
  limit,
  type,
  diet,
  cuisine,
  maxReadyTime,
  language,
  currency,
  userId,
  isLogged,
  sort,
  sortDirection,
) => {
  if (
    !query &&
    !sort &&
    !sortDirection &&
    !cuisine &&
    !diet &&
    maxReadyTime == 1000 &&
    !type
  ) {
    return fetchRandomRecipes(limit, language, currency, userId, isLogged);
  }
  const url = buildRecipeUrl(
    query,
    limit,
    type,
    diet,
    cuisine,
    maxReadyTime,
    sort,
    sortDirection,
  );
  const response = await axios.get(url);
  const recipesFromApi = response.data.results.filter(
    (recipe) => recipe.image !== undefined,
  );

  const recipesFromDb = await getRecipesFromDatabaseComplex(
    query,
    limit,
    type,
    diet,
    cuisine,
    maxReadyTime,
    sort,
    sortDirection,
  );

  const allRecipes = [...recipesFromApi, ...recipesFromDb];
  const sortedRecipes = sortRecipes(allRecipes, sort, sortDirection).slice(
    0,
    limit,
  );
  const mapedRecipes = await fetchRecipesData(
    sortedRecipes,
    language,
    currency,
  );

  if (isLogged) await markFavorites(mapedRecipes, userId);

  if (currency) return await changeCurrency(mapedRecipes, currency);
  return mapedRecipes;
};

/**
 * @desc Build the URL to fetch recipes from.
 * @param {string} query - The query to search by.
 * @param {number} limit - The limit of the query.
 * @param {string} type - The type of the recipe.
 * @param {string} diet - The diet of the recipe.
 * @param {string} cuisine - The cuisine of the recipe.
 * @param {number} maxReadyTime - The max ready time of the recipe.
 * @param {string} sort - The value to sort by.
 * @param {string} sortDirection - The direction of the sort.
 * @returns {string} The URL to fetch recipes from.
 */
const buildRecipeUrl = (
  query,
  limit,
  type,
  diet,
  cuisine,
  maxReadyTime,
  sort,
  sortDirection,
) => {
  const convertToJsonString = (param) => {
    if (typeof param === "string" && param.length > 0) {
      const paramArray = JSON.parse(param);
      if (Array.isArray(paramArray) && paramArray.length > 0)
        return paramArray.map((p) => p.value).join(" ");
      else return "";
    }
    return param;
  };

  cuisine = convertToJsonString(cuisine);
  type = convertToJsonString(type);
  diet = convertToJsonString(diet);

  const url = `${baseUrl}/complexSearch?apiKey=${getApiKey()}&query=${query}&number=${limit}&addRecipeNutrition=true&instructionsRequired=true&type=${type}&diet=${diet}&cuisine=${cuisine}&maxReadyTime=${maxReadyTime}&sort=${sort}&sortDirection=${sortDirection}`;
  return url;
};

/**
 * @desc Sort the recipes by the value and direction.
 * @param {Array} recipes - The array of recipes to sort.
 * @param {string} sort - The value to sort by.
 * @param {string} sortDirection - The direction of the sort.
 * @returns {Array} The sorted array of recipes.
 */
const sortRecipes = (recipes, sort, sortDirection) => {
  if (sort) {
    const sortFactor = sortDirection === "desc" ? -1 : 1;
    let sortCallback;
    if (sort === "time") {
      sortCallback = (factor) => (a, b) =>
        factor * (a.readyInMinutes - b.readyInMinutes);
    } else if (sort === "popularity") {
      sortCallback = (factor) => (a, b) =>
        factor * (a.aggregateLikes - b.aggregateLikes);
    } else if (sort === "price") {
      sortCallback = (factor) => (a, b) =>
        factor * (a.pricePerServing - b.pricePerServing);
    }
    recipes.sort(sortCallback(sortFactor));
  }
  return recipes;
};

/**
 * @desc Fetch the random recipes.
 * @param {number} limit - The limit of the query.
 * @param {string} language - The language of the data.
 * @param {boolean} isLogged - The User is logged.
 * @param {string} userId - The id of the user.
 * @param {string} currency - The currency of the data.
 * @returns {Promise<Object>} The array of recipes.
 */
const fetchRandomRecipes = async (
  limit,
  language,
  currency,
  userId,
  isLogged,
) => {
  const url = `${baseUrl}/random?apiKey=${getApiKey()}&number=${limit}&instructionsRequired=true&`;
  const response = await axios.get(url);
  const dbRecipes = await getRecipesFromDatabaseRandom(limit, userId);
  const recipesByAPI = response.data.recipes.filter(
    (recipe) => recipe.image !== undefined,
  );
  const combinedRecipes = [...recipesByAPI, ...dbRecipes];

  const randomSample = getRandomSample(
    combinedRecipes,
    Math.min(limit, combinedRecipes.length),
  ).slice(0, limit);
  const mapedRecipes = await fetchRecipesData(randomSample, language, currency);

  if (isLogged) await markFavorites(mapedRecipes, userId);

  if (currency) return await changeCurrency(mapedRecipes, currency);

  return mapedRecipes;
};

/**
 * @desc Fetch the recommended recipes.
 * @param {string} recipeId - The id of the recipe.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {boolean} isLogged - The User is logged.
 * @param {string} userId - The id of the user.
 * @returns {Promise} The array of recommended recipes.
 */
const fetchRecommendedRecipes = async (
  recipeId,
  language,
  currency,
  userId,
  isLogged,
) => {
  if (!isSpoonacularRecipe(recipeId)) {
    const recipeByDB = await Recipe.findById(recipeId);
    const url = `${baseUrl}/complexSearch?apiKey=${getApiKey()}&query=${recipeByDB.title}&number=1&addRecipeNutrition=true`;
    const response = await axios.get(url);
    if (response.data.results.length === 0)
      return "This recipe dont have recomended recepts";
    return await fetchRecommendedRecipes(
      response.data.results[0].recipeId,
      language,
      currency,
      userId,
      isLogged,
    );
  }
  const url = `${baseUrl}/${recipeId}/similar?apiKey=${getApiKey()}`;
  const response = await axios.get(url);
  return Promise.all(
    response.data
      .map(async (recipe) =>
        fetchInformationByRecommended(
          recipe.id,
          language,
          currency,
          userId,
          isLogged,
        ),
      )
      .filter((recipe) => recipe !== undefined),
  );
};

/**
 * @desc Fetch the information by recommended.
 * @param {string} recipeId - The id of the recipe.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {boolean} isLogged - The User is logged.
 * @param {string} userId - The id of the user.
 * @returns {Promise<Object>} The recipe information.
 */
const fetchInformationByRecommended = async (
  recipeId,
  language,
  currency,
  userId,
  isLogged,
) => {
  const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${getApiKey()}`;

  const response = await axios.get(url);
  if (response.data.instructions === null) return;
  const recipeData = response.data;
  let isFavourite = false;
  if (isLogged)
    isFavourite =
      (
        await FavoriteRecipe.find({
          user: userId,
          recipe: recipeId,
        })
      ).length === 1;

  const recipeBase = {
    id: recipeData.id,
    title: recipeData.title,
    dishTypes: recipeData.dishTypes || [],
    image: recipeData.image,
    readyInMinutes: recipeData.readyInMinutes + " min",
    pricePerServing: recipeData.pricePerServing,
    isFavourite,
  };

  if (language !== "en" || !language)
    await translateRecipeInformation(recipeData, language);

  if (currency) return await changeCurrency(recipeBase, currency);
  return recipeBase;
};

/**
 * @desc Fetch the aggregate likes by id.
 * @param {string} recipeId - The id of the recipe.
 * @returns {Promise} The aggregate likes of the recipe.
 */
const fetchAggregateLikesById = async (recipeId) => {
  const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${getApiKey()}`;
  const response = await axios.get(url);
  return { aggregateLikes: response.data.aggregateLikes };
};

/**
 * @desc Parse the ingredients.
 * @param {Array} ingredients - The ingredients to parse.
 * @returns {Promise} The total estimated cost of the ingredients.
 */
const parsedIngredients = async (ingredients) => {
  const url = `${baseUrl}/parseIngredients?includeNutrition=false&apiKey=${getApiKey()}`;

  const buildFormData = (ingredients) => {
    const ingredientList = ingredients.map((item) => item.original).join("\n");
    const formData = new URLSearchParams();
    formData.append("ingredientList", ingredientList);
    return formData;
  };

  const calculateTotalEstimatedCost = (data) => {
    return data.reduce((total, item) => {
      if (item?.estimatedCost?.value) return total + item.estimatedCost.value;
      return total;
    }, 0);
  };

  try {
    const formData = buildFormData(ingredients);

    const response = await axios.post(url, formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.data || !Array.isArray(response.data))
      throw ApiError.BadRequest("Failed to parse ingredients");

    let totalEstimatedCost = calculateTotalEstimatedCost(response.data);
    totalEstimatedCost = parseFloat((totalEstimatedCost / 100).toFixed(2));

    return totalEstimatedCost;
  } catch (error) {
    throw ApiError.BadRequest("Failed to parse ingredients");
  }
};

/**
 * @desc Fetch the recipe information by id.
 * @param {string} recipeId - The id of the recipe.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {string} userId - The user id.
 * @param {boolean} isLogged - The User is logged
 * @returns {Promise<Object>} The recipe information.
 */
const fetchInformationById = async (
  recipeId,
  language,
  currency,
  userId,
  isLogged,
) => {
  const createRecipeObject = (data, isFavourite, language) => {
    if (language !== "en" || !language) handleRecipeTranslation(data, language);
    return {
      id: data._id || data.recipeId,
      title: data.title,
      image: data.image,
      diets: data.diets || [],
      instructions: data.instructions,
      extendedIngredients:
        data.extendedIngredients?.map((ingredient) => ingredient.original) ||
        [],
      pricePerServing: data.pricePerServing,
      readyInMinutes: data.readyInMinutes + " min",
      dishTypes: data.dishTypes || [],
      aggregateLikes: data.aggregateLikes,
      isFavourite,
      paymentStatus: data.paymentStatus,
    };
  };

  const handleRecipeTranslation = async (data, language) => {
    await translateRecipeInformation(data, language);
    data.extendedIngredients = await Promise.all(
      data.extendedIngredients.map(async (ingredient) => {
        ingredient.original = await translateText(
          ingredient.original,
          language,
        );
        return ingredient.original;
      }),
    );

    data.diets = await Promise.all(
      data.diets.map((diet) => translateText(diet, language)),
    );
    data.instructions = await translateText(data.instructions, language);
    data.cuisines = await Promise.all(
      data.cuisines.map((cuisine) => translateText(cuisine, language)),
    );
  };

  const handlePaymentStatus = (data, user) => {
    if (
      !data.paymentInfo.paymentStatus &&
      !user.boughtRecipes.includes(data._id.toString())
    ) {
      data.instructions = `<ol><li>Boil water in a large pot.</li><li>Add pasta to the boiling water.</li><li>Cook pasta according to package instructions until al dente.</li><li>Drain pasta in a colander.</li><li>Return pasta to the pot.</li><li>Add your favorite sauce and mix well.</li><li>Serve hot and enjoy!</li></ol>`;
      data.analyzedInstructions = undefined;
      data.paymentStatus = false;
    } else data.paymentStatus = true;
  };

  const fetchRecipeFromDB = async () => {
    const data = await Recipe.findById(recipeId).lean();
    if (!data) throw ApiError.BadRequest("Recipe not found");

    let isFavourite = false;
    if (isLogged) {
      isFavourite =
        (await FavoriteRecipe.find({
          user: userId,
          recipe: recipeId,
        }).length) === 1;
      const user = await User.findById(userId);
      handlePaymentStatus(data, user);
    } else handlePaymentStatus(data, {});

    if (currency) await changeCurrency(data, currency);

    return createRecipeObject(data, isFavourite, language);
  };

  const fetchRecipeFromAPI = async () => {
    const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${getApiKey()}`;
    const response = await axios.get(url);
    const data = response.data;
    let isFavourite = false;

    const refactorInstructions = refactorInstructionbyHTML(data.instructions);

    data.instructions = refactorInstructions;

    if (currency) await changeCurrency(data, currency);
    if (isLogged)
      isFavourite =
        (await FavoriteRecipe.find({ user: userId, recipe: recipeId }))
          .length === 1;
    return createRecipeObject(data, isFavourite, language);
  };

  if (isSpoonacularRecipe(recipeId)) return await fetchRecipeFromAPI();
  return await fetchRecipeFromDB();
};

/**
 * @desc Fetch the favorite recipes.
 * @param {string} userId - The id of the user.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @returns {Promise} The array of favorite recipes.
 */
const fetchFavoriteRecipes = async (userId, language, currency) => {
  const getRecipeObject = async (fetchedRecipe, language, currency) => {
    if (language && language !== "en")
      await translateRecipeFavInformation(fetchedRecipe, language);

    return {
      id: fetchedRecipe.recipe,
      title: fetchedRecipe.title,
      image: fetchedRecipe.image,
      diets: fetchedRecipe.diets || [],
      cuisine: fetchedRecipe.cuisines || [],
      instructions: fetchedRecipe.instructions,
      readyInMinutes: fetchedRecipe.readyInMinutes,
      pricePerServing: !currency
        ? parseFloat(fetchedRecipe.pricePerServing) + " USD"
        : parseFloat(fetchedRecipe.pricePerServing),
      dishTypes: fetchedRecipe.dishTypes || [],
      isFavourite: true,
      aggregateLikes: fetchedRecipe.aggregateLikes,
    };
  };

  const favoriteRecipesByDb = await FavoriteRecipe.find({ user: userId });
  if (!favoriteRecipesByDb || favoriteRecipesByDb.length === 0) return [];
  const allFavoriteRecipes = await Promise.all(
    favoriteRecipesByDb.map(async (fetchedRecipe) => {
      const recipe = getRecipeObject(fetchedRecipe, language);
      if (currency) await changeCurrency(recipe, currency);
      return recipe;
    }),
  );
  return allFavoriteRecipes;
};

module.exports = {
  fetchRecipesUnified,
  fetchRandomRecipes,
  fetchRecommendedRecipes,
  fetchInformationById,
  fetchFavoriteRecipes,
  fetchRecipesByIngredients,
  parsedIngredients,
  fetchAggregateLikesById,
};
