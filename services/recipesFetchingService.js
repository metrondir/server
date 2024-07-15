const axios = require("axios");
const { baseUrl, getApiKey } = require("../config/configApiHandler");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const User = require("../models/userModel");
const Recipe = require("../models/recipeModel");
const {
  translateText,
  translateRecipeInformation,
  detectLanguage,
} = require("./translationService");
const {
  getRecipesFromDatabaseRandom,
  getRecipesFromDatabaseByIngridients,
  getRecipesFromDatabaseComplex,
  getRecipesFromDatabaseByTitle,
} = require("./databaseRecipeFetchingService");
const {
  recipeDto,
  recipeEnDto,
  favouriteRecipeDto,
  favouriteRecipeEnDto,
} = require("../dtos/recipeDtos");
const {
  recipeDetailEnDto,
  recipeDetailDto,
} = require("../dtos/recipeDetailDtos");
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
 * @desc Mark the recipe as favourite.
 * @param {Object} recipe - The recipe to mark as favourite.
 * @param {string} userId - The id of the user.
 * @returns {Promise<Object>} The array of recipes with the favourites marked.
 */
const markFavouriteRecipe = async (recipe, userId) => {
  const favourites = await FavoriteRecipe.find({
    user: userId,
    recipe: recipe.id,
  });

  const isFavoriteRecipe = favourites.length === 1;
  recipe.isFavourite = isFavoriteRecipe;

  return recipe;
};
/**
 * @desc Fetch the data of the recipes.
 * @param {Array} response - The array of recipes to fetch data from.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @returns {Promise<Array>} The array of recipes with the fetched data.
 */

const mapRecipes = async (response, language, currency) => {
  if (language == "en" || !language)
    return response.map((recipe) => new recipeEnDto(recipe));

  await Promise.all(
    response.map((recipe) => translateRecipeInformation(recipe, language)),
  );
  return response.map((recipe) => new recipeDto(recipe));
};

/**
 * @desc Fetch the data of the recipes.
 * @param {Array} response - The array of recipes to fetch data from.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @returns {Promise<Array>} The array of recipes with the fetched data.
 */

const mapFavouriteRecipes = async (response, language, currency) => {
  if (language == "en" || !language) {
    const recipes = response.map((recipe) => new favouriteRecipeEnDto(recipe));
    if (currency) await changeCurrency(recipes, currency);
    return recipes;
  }
  await Promise.all(
    response.map((recipe) => translateRecipeInformation(recipe, language)),
  );
  const recipes = response.map((recipe) => new favouriteRecipeDto(recipe));
  if (currency) await changeCurrency(recipes, currency);
  return recipes;
};

/**
 * @desc Fetch the data of the recipes.
 * @param {Array} response - The array of recipes to fetch data from.
 * @param {string} language - The language to translate to.
 * @param {string} currency - The currency to change to.
 * @returns {Promise<Array>} The array of recipes with the fetched data.
 */
const mapRecipesDetail = async (response, language, currency) => {
  if (language == "en" || !language) {
    const recipes = new recipeDetailEnDto(response);
    if (currency) await changeCurrency(recipes, currency);
    return recipes;
  }
  await Promise.all(
    response.forEach((recipe) => translateRecipeInformation(recipe, language)),
  );
  const recipes = new recipeDetailDto(response);
  if (currency) await changeCurrency(recipes, currency);
  return recipes;
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

  const [response, recipesFromDb] = await Promise.all([
    axios.get(url),
    getRecipesFromDatabaseByIngridients(number, ingredients),
  ]);

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
  const isDefaultRequest =
    !query &&
    !sort &&
    !sortDirection &&
    !cuisine &&
    !diet &&
    maxReadyTime == 1000 &&
    !type;

  if (isDefaultRequest)
    return fetchRandomRecipes(limit, language, currency, userId, isLogged);

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

  const [apiResponse, dbRecipes] = await Promise.all([
    axios.get(url),
    getRecipesFromDatabaseComplex(
      query,
      limit,
      type,
      diet,
      cuisine,
      maxReadyTime,
      sort,
      sortDirection,
    ),
  ]);

  const recipesFromApi = apiResponse.data.results.filter(
    (recipe) => recipe.image,
  );
  const allRecipes = [...recipesFromApi, ...dbRecipes];
  const sortedRecipes = sortRecipes(allRecipes, sort, sortDirection).slice(
    0,
    limit,
  );

  const mappedRecipes = await mapRecipes(sortedRecipes, language, currency);

  if (isLogged) await markFavorites(mappedRecipes, userId);

  return mappedRecipes;
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
    const sortKey =
      sort === "time"
        ? "readyInMinutes"
        : sort === "popularity"
          ? "aggregateLikes"
          : "pricePerServing";
    return recipes.sort((a, b) => sortFactor * (a[sortKey] - b[sortKey]));
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
  const [apiResponse, dbRecipes] = await Promise.all([
    axios.get(url),
    getRecipesFromDatabaseRandom(limit, userId),
  ]);

  const recipesByAPI = apiResponse.data.recipes.filter(
    (recipe) =>
      recipe.image && recipe.instructions && recipe.instructions.trim() !== "",
  );
  const combinedRecipes = [...recipesByAPI, ...dbRecipes];

  const randomSample = getRandomSample(
    combinedRecipes,
    Math.min(limit, combinedRecipes.length),
  ).slice(0, limit);
  const mappedRecipes = await mapRecipes(randomSample, language, currency);

  if (isLogged) await markFavorites(mappedRecipes, userId);

  return mappedRecipes;
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
    const [response, recipesFromDb] = await Promise.all([
      axios.get(url),
      getRecipesFromDatabaseByTitle(recipeByDB.title, recipeId),
    ]);
    const allRecipes = [...response.data.results, ...recipesFromDb];
    console.log(allRecipes);

    if (allRecipes.length === 0) return [];
    return Promise.all(
      allRecipes
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
  }
  const url = `${baseUrl}/${recipeId}/similar?apiKey=${getApiKey()}`;
  const urlForTitle = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${getApiKey()}`;
  const [responseForTitle, response] = await Promise.all([
    axios.get(urlForTitle),
    axios.get(url),
  ]);

  const recipesFromDb = await getRecipesFromDatabaseByTitle(
    responseForTitle.data.title,
    null,
  );
  const allRecipes = [...response.data, ...recipesFromDb];
  return Promise.all(
    allRecipes
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
  if (!isSpoonacularRecipe(recipeId)) {
    const recipe = mapRecipesDetail(recipeId, language, currency);
    if (isLogged) await markFavouriteRecipe(recipe, userId);
    return recipe;
  }
  const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${getApiKey()}`;

  const response = await axios.get(url);
  if (response.data.instructions === null) return;
  const recipeData = response.data;
  const recipe = await mapRecipesDetail(recipeData, language, currency);
  if (isLogged) await markFavouriteRecipe(recipe, userId);
  return recipe;
};

/**
 * @desc Fetch the aggregate likes by id.
 * @param {string} recipeId - The id of the recipe.
 * @returns {Promise} The aggregate likes of the recipe.
 */
const fetchAggregateLikesById = async (recipeId) => {
  if (!isSpoonacularRecipe(recipeId)) {
    const recipe = await Recipe.findById(recipeId);
    return { aggregateLikes: recipe.aggregateLikes };
  }
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
  const handlePaymentStatus = (data, user) => {
    if (
      !data.paymentInfo.paymentStatus &&
      user.boughtRecipes &&
      Array.isArray(user.boughtRecipes) &&
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

    if (isLogged) {
      const user = await User.findById(userId);
      handlePaymentStatus(data, user);
    } else handlePaymentStatus(data, {});
    const recipe = await mapRecipesDetail(data, language, currency);
    if (isLogged) await markFavouriteRecipe(recipe, userId);
    return recipe;
  };

  const fetchRecipeFromAPI = async () => {
    const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${getApiKey()}`;
    const response = await axios.get(url);
    const data = response.data;
    const refactorInstructions = refactorInstructionbyHTML(data.instructions);

    data.instructions = refactorInstructions;

    const recipe = await mapRecipesDetail(data, language, currency);
    if (isLogged) await markFavouriteRecipe(recipe, userId);
    return recipe;
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
  const favoriteRecipesByDb = await FavoriteRecipe.find({ user: userId });
  if (!favoriteRecipesByDb || favoriteRecipesByDb.length === 0) return [];
  const allFavoriteRecipes = mapFavouriteRecipes(
    favoriteRecipesByDb,
    language,
    currency,
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
