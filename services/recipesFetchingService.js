const axios = require("axios");
const { baseUrl, getApiKey } = require("../config/configApiHandler");
const FavoriteRecipe = require("../models/favoriteRecipeModel");

const Recipe = require("../models/recipeModel");
const {
  translateText,
  handleApiError,
  translateRecipeInformation,
  detectLanguage,
  translateRecipeFavInformation,
} = require("./translationService");
const {
  getRecipesFromDatabaseRandom,
  getRecipesFromDatabaseByIngridients,
  getRecipesFromDatabaseComplex,
  getRecipesFromDatabaseRandomWithUsers,
} = require("./databaseRecipeFetchingService");
const { findUserByRefreshToken } = require("./userService");
const { changeCurrency } = require("./changeCurrencyRecipesService");
const ApiError = require("../middleware/apiError");

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
      return recipeIdString === recipeId;
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
      pricePerServing: !currency
        ? parseFloat((recipe.pricePerServing / 100).toFixed(2)) + " USD"
        : parseFloat((recipe.pricePerServing / 100).toFixed(2)),
      readyInMinutes: recipe.readyInMinutes + " min",
      dishTypes: recipe.dishTypes || [],
      isFavourite: recipe?.isFavourite,
      cuisines: recipe.cuisines || [],
      aggregateLikes: recipe?.aggregateLikes,
    }));
  } else {
    await Promise.all(
      response.map((recipe) => translateRecipeInformation(recipe, language)),
    );
    const translatedMin = await translateText("min", language);

    return response.map((recipe) => ({
      id: recipe.id || recipe._id,
      title: recipe.title,
      image: recipe.image,
      cuisines: recipe.cuisines || [],
      pricePerServing: !currency
        ? parseFloat((recipe.pricePerServing / 100).toFixed(2)) + " USD"
        : parseFloat((recipe.pricePerServing / 100).toFixed(2)),
      readyInMinutes:
        typeof recipe.readyInMinutes === "number"
          ? `${recipe.readyInMinutes} ${translatedMin}`
          : recipe.readyInMinutes,
      dishTypes: recipe.dishTypes || [],
      isFavourite: recipe?.isFavourite,
      aggregateLikes: recipe?.aggregateLikes,
    }));
  }
};

/**
 * @desc Fetch the recipes by ingredients.
 * @param {number} number - The number of recipes to fetch.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {string} refreshToken - The refresh token.
 * @param {string} ingredients - The ingredients to search by.
 * @returns {Promise<Object} The array of recipes.
 */
const fetchRecipesByIngredients = async (
  number,
  language,
  currency,
  refreshToken,
  ingredients,
) => {
  let apiKey = getApiKey();
  const lanIngredients = await detectLanguage(ingredients);
  if (lanIngredients !== "en")
    ingredients = await translateText(ingredients, "en");
  let url = `${baseUrl}/findByIngredients?apiKey=${apiKey}&ingredients=${ingredients}&number=${number}&ignorePantry=true`;

  try {
    const response = await axios.get(url);

    const recipesFromDb = await getRecipesFromDatabaseByIngridients(
      number,
      ingredients,
    );

    const allRecipes = response.data.concat(recipesFromDb);
    allRecipes.splice(number, allRecipes.length - number);
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);

      await markFavorites(allRecipes, user._id);
    }
    let RandomSample = getRandomSample(
      allRecipes,
      Math.floor(allRecipes.length),
    );
    const recipes = Promise.all(
      RandomSample.map(async (recipe) =>
        fetchInformationByRecommended(
          recipe.id,
          language,
          currency,
          refreshToken,
        ),
      ),
    );

    return recipes;
  } catch (error) {
    return handleApiError(
      error,
      fetchRecipesByIngredients,
      ingredients,
      number,
      language,
      currency,
      refreshToken,
    );
  }
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
 * @param {string} refreshToken - The refresh token.
 * @param {string} sort - The value to sort by.
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
  refreshToken,
  sort,
  sortDirection,
) => {
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

  try {
    const response = await axios.get(url);
    const recipesFromApi = response.data.results;

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

    let allRecipes = recipesFromApi.concat(recipesFromDb);
    allRecipes = sortRecipes(allRecipes, sort, sortDirection);

    allRecipes.splice(limit, allRecipes.length - limit);

    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);
      await markFavorites(allRecipes, user._id);
    }

    const recipes = await fetchRecipesData(allRecipes, language, currency);
    if (currency) return await changeCurrency(recipes, currency);

    return recipes;
  } catch (error) {
    return handleApiError(
      error,
      fetchRecipesUnified,
      query,
      limit,
      type,
      diet,
      cuisine,
      maxReadyTime,
      language,
      currency,
      refreshToken,
      sort,
      sortDirection,
    );
  }
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
    if (typeof param === "string") {
      try {
        const paramArray = JSON.parse(param);
        if (Array.isArray(paramArray) && paramArray.length > 0) {
          return paramArray.map((p) => p.value).join(" ");
        } else {
          return "";
        }
      } catch (error) {
        console.error(`Error parsing ${param} JSON:`, error);
        return "";
      }
    }
    return param;
  };

  cuisine = convertToJsonString(cuisine);
  type = convertToJsonString(type);
  diet = convertToJsonString(diet);

  let url = `${baseUrl}/complexSearch?apiKey=${getApiKey()}&query=${query}&number=${limit}&addRecipeNutrition=true&type=${type}&diet=${diet}&cuisine=${cuisine}&maxReadyTime=${maxReadyTime}&sort=${sort}&sortDirection=${sortDirection}`;
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
 * @param {string} refreshToken - The refresh token.
 * @param {string} currency - The currency of the data.
 * @returns {Promise<Object>} The array of recipes.
 */
const fetchRandomRecipes = async (limit, language, refreshToken, currency) => {
  const apiKey = getApiKey();
  const url = `${baseUrl}/random?apiKey=${apiKey}&number=${limit}`;

  try {
    const response = await axios.get(url);
    let allRecipes = response.data.recipes;

    if (!refreshToken) {
      const dbRecipes = await getRecipesFromDatabaseRandom(limit);
      allRecipes = allRecipes.concat(dbRecipes);
    } else {
      const user = await findUserByRefreshToken(refreshToken);
      const dbRecipes = await getRecipesFromDatabaseRandomWithUsers(
        limit,
        user.id,
      );
      allRecipes = allRecipes.concat(dbRecipes);
      await markFavorites(allRecipes, user._id);
    }

    const filteredRecipes = allRecipes.filter(
      (recipe) => !!recipe.instructions,
    );
    const enrichedRecipes = await fetchRecipesData(
      filteredRecipes,
      language,
      currency,
    );
    const randomSample = getRandomSample(
      enrichedRecipes,
      Math.min(limit, enrichedRecipes.length),
    );
    const finalSample = randomSample.slice(0, limit);

    if (currency) {
      await changeCurrency(finalSample, currency);
    }

    return finalSample;
  } catch (error) {
    return handleApiError(error, fetchRandomRecipes, limit, language, currency);
  }
};

/**
 * @desc Fetch the recommended recipes.
 * @param {string} recipeId - The id of the recipe.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @returns {Promise} The array of recommended recipes.
 */
const fetchRecommendedRecipes = async (recipeId, language, currency) => {
  let apiKey = getApiKey();
  if (recipeId.length > 9) {
    const recipeByBD = await Recipe.findById(recipeId);
    let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&query=${recipeByBD.title}&number=1&addRecipeNutrition=true`;
    const response = await axios.get(url);
    if (response.data.results.length > 0) {
      return await fetchRecommendedRecipes(
        response.data.results[0].recipeId,
        language,
        currency,
      );
    } else {
      return "This recipe dont have recomended recepts";
    }
  } else {
    const url = `${baseUrl}/${recipeId}/similar?apiKey=${apiKey}`;
    try {
      const response = await axios.get(url);
      const stringId = recipeId.toString();
      if (stringId.length <= 7) {
        return Promise.all(
          response.data.map(async (recipe) =>
            fetchInformationByRecommended(recipe.id, language, currency),
          ),
        );
      }
    } catch (error) {
      return handleApiError(
        error,
        fetchRecommendedRecipes,
        id,
        language,
        currency,
      );
    }
  }
};

/**
 * @desc Fetch the information by recommended.
 * @param {string} recipeId - The id of the recipe.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {string} refreshToken - The refresh token.
 * @returns {Promise<Object>} The recipe information.
 */
const fetchInformationByRecommended = async (
  recipeId,
  language,
  currency,
  refreshToken,
) => {
  const apiKey = getApiKey();
  const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${apiKey}`;
  let favourites = [];

  try {
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);
      favourites = await FavoriteRecipe.find({ user: user._id });
    }

    const response = await axios.get(url);

    if (response.data.instructions == null) {
      return;
    }
    const recipeData = response.data;
    const isFavourite = favourites.some(
      (fav) => fav.recipe === recipeData.recipeId,
    );
    const pricePerServing = parseFloat(
      (recipeData.pricePerServing / 100).toFixed(2),
    );
    const recipeBase = {
      id: recipeData.recipeId,
      title: recipeData.title,
      dishTypes: recipeData.dishTypes || [],
      image: recipeData.image,
      readyInMinutes: recipeData.readyInMinutes + " min",
      pricePerServing: !currency ? pricePerServing + " USD" : pricePerServing,
      isFavourite,
    };

    if (language !== "en" && language) {
      await translateRecipeInformation(recipeData, language);
      recipeBase.readyInMinutes = recipeData.readyInMinutes;
    }

    if (currency) {
      await changeCurrency(recipeBase, currency);
    }

    return recipeBase;
  } catch (error) {
    console.error("Error fetching recommended recipe information:", error);
    return handleApiError(
      error,
      fetchInformationByRecommended,
      recipeId,
      language,
      currency,
      refreshToken,
    );
  }
};

/**
 * @desc Fetch the aggregate likes by id.
 * @param {string} recipeId - The id of the recipe.
 * @returns {Promise} The aggregate likes of the recipe.
 */
const fetchAggregateLikesById = async (recipeId) => {
  let apiKey = getApiKey();
  const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${apiKey}`;
  try {
    const response = await axios.get(url);
    return { aggregateLikes: response.data.aggregateLikes };
  } catch (error) {
    return handleApiError(error, fetchInformationById, recipeId, language);
  }
};

/**
 * @desc Parse the ingredients.
 * @param {Array} ingredients - The ingredients to parse.
 * @returns {Promise} The total estimated cost of the ingredients.
 */
const parsedIngredients = async (ingredients) => {
  const apiKey = getApiKey();
  const url = `${baseUrl}/parseIngredients?includeNutrition=false&apiKey=${apiKey}`;

  const buildFormData = (ingredients) => {
    const ingredientList = ingredients.map((item) => item.original).join("\n");
    const formData = new URLSearchParams();
    formData.append("ingredientList", ingredientList);
    return formData;
  };

  const calculateTotalEstimatedCost = (data) => {
    return data.reduce((total, item) => {
      if (item?.estimatedCost?.value) {
        return total + item.estimatedCost.value;
      }
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

    if (!response.data || !Array.isArray(response.data)) {
      throw ApiError.BadRequest("Failed to parse ingredients");
    }

    let totalEstimatedCost = calculateTotalEstimatedCost(response.data);
    totalEstimatedCost = parseFloat((totalEstimatedCost / 100).toFixed(2));

    return totalEstimatedCost;
  } catch (error) {
    console.error("Error parsing ingredients:", error.message);
    throw ApiError.BadRequest("Failed to parse ingredients");
  }
};

/**
 * @desc Fetch the recipe information by id.
 * @param {string} recipeId - The id of the recipe.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @param {string} refreshToken - The refresh token.
 * @returns {Promise<Object>} The recipe information.
 */
const fetchInformationById = async (
  recipeId,
  language,
  currency,
  refreshToken,
) => {
  const apiKey = getApiKey();

  const createRecipeObject = (data, isFavourite, currency, language) => {
    const pricePerServing = currency
      ? data.pricePerServing
      : parseFloat(data.pricePerServing) + " USD";

    return {
      id: data._id || data.recipeId,
      title: data.title,
      image: data.image,
      diets: data.diets || [],
      instructions: data.instructions,
      extendedIngredients:
        data.extendedIngredients?.map((ingredient) => ingredient.original) ||
        [],
      pricePerServing,
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
    } else {
      data.paymentStatus = true;
    }
  };

  const fetchRecipeFromDB = async (recipeId, refreshToken) => {
    const data = await Recipe.findById(recipeId);
    if (!data) throw ApiError.BadRequest("Recipe not found");

    let favourites = [];
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);
      favourites = await FavoriteRecipe.find({ user: user._id });
      handlePaymentStatus(data, user);
    } else {
      handlePaymentStatus(data, {});
    }
    console.log(favourites);
    const isFavourite = favourites.some(
      (fav) => fav.recipe.toString() === data._id.toString(),
    );

    if (language !== "en" && language) {
      await handleRecipeTranslation(data, language);
    }
    if (currency) {
      await changeCurrency(data, currency);
    }
    return createRecipeObject(data, isFavourite, currency, language);
  };

  const fetchRecipeFromAPI = async (recipeId, language, currency) => {
    const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;

    let favourites = [];
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);
      favourites = await FavoriteRecipe.find({ user: user._id });
    }
    const isFavourite = favourites.some((fav) => fav.recipe === data.recipeId);

    if (language !== "en" && language) {
      await handleRecipeTranslation(data, language);
    }
    if (currency) {
      await changeCurrency(data, currency);
    }
    return createRecipeObject(data, isFavourite, currency, language);
  };

  try {
    if (recipeId.length >= 9) {
      return await fetchRecipeFromDB(recipeId, refreshToken);
    } else {
      return await fetchRecipeFromAPI(recipeId, language, currency);
    }
  } catch (error) {
    console.error("Error fetching recipe information:", error);
    return handleApiError(
      error,
      fetchInformationById,
      recipeId,
      language,
      currency,
      refreshToken,
    );
  }
};

/**
 * @desc Fetch the favorite recipes.
 * @param {string} userId - The id of the user.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @returns {Promise} The array of favorite recipes.
 */
const fetchFavoriteRecipes = async (userId, language, currency) => {
  const getRecipeObject = (fetchedRecipe, translated = false) => ({
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
  });

  try {
    const favoriteRecipesByDb = await FavoriteRecipe.find({ user: userId });

    const allFavoriteRecipes = await Promise.all(
      favoriteRecipesByDb.map(async (fetchedRecipe) => {
        try {
          let recipe;
          if (language == "en" || !language) {
            recipe = getRecipeObject(fetchedRecipe);
          } else {
            await translateRecipeFavInformation(fetchedRecipe, language);
            recipe = getRecipeObject(fetchedRecipe, true);
          }

          if (currency) {
            await changeCurrency(recipe, currency);
          }
          return recipe;
        } catch (error) {
          console.error(
            `Error processing recipe ID ${fetchedRecipe.recipe}:`,
            error,
          );
          throw ApiError.BadRequest("Failed to fetch favorite recipes");
        }
      }),
    );

    return allFavoriteRecipes;
  } catch (error) {
    throw ApiError.BadRequest("Failed to fetch favorite recipes");
  }
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
