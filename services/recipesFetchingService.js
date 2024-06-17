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
  getSpoonAcularChangedLikeRecipe,
  getRecipesFromDatabaseRandomWithUsers,
} = require("./databaseRecipeFetchingService");
const { findUserByRefreshToken } = require("./userService");
const { changeCurrency } = require("./changeCurrencyRecipesService");
const ApiError = require("../middleware/apiError");

const getRandomSample = (array, size) => {
  const shuffled = array.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
};

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

    const recipes = await getRecipesFromDatabaseByIngridients(
      number,
      ingredients,
    );

    const allRecipes = response.data.concat(recipes);
    allRecipes.splice(number, allRecipes.length - number);
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);

      await markFavorites(allRecipes, user._id);
    }
    let RandomSample = getRandomSample(
      allRecipes,
      Math.floor(allRecipes.length),
    );
    const recipe = Promise.all(
      RandomSample.map(async (recipe) =>
        fetchInformationByRecommended(
          recipe.id,
          language,
          currency,
          refreshToken,
        ),
      ),
    );

    return recipe;
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

    const finalRecipes = await fetchRecipesData(allRecipes, language, currency);
    if (currency) return await changeCurrency(finalRecipes, currency);

    return finalRecipes;
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

const fetchRecommendedRecipes = async (id, language, currency) => {
  let apiKey = getApiKey();
  if (id.length > 9) {
    const recipeByBD = await Recipe.findById(id);
    let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&query=${recipeByBD.title}&number=1&addRecipeNutrition=true`;
    const response = await axios.get(url);
    if (response.data.results.length > 0) {
      return await fetchRecommendedRecipes(
        response.data.results[0].id,
        language,
        currency,
      );
    } else {
      return "This recipe dont have recomended recepts";
    }
  } else {
    const url = `${baseUrl}/${id}/similar?apiKey=${apiKey}`;
    try {
      const response = await axios.get(url);
      const stringId = id.toString();
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

const fetchInformationByRecommended = async (
  id,
  language,
  currency,
  refreshToken,
) => {
  const apiKey = getApiKey();
  const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
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
      (fav) => fav.recipe.toString() === recipeData.id.toString(),
    );
    const pricePerServing = parseFloat(
      (recipeData.pricePerServing / 100).toFixed(2),
    );
    const recipeBase = {
      id: recipeData.id,
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
      id,
      language,
      currency,
      refreshToken,
    );
  }
};

const fetchAggregateLikesById = async (recipeId) => {
  let apiKey = getApiKey();
  const url = `${baseUrl}/${recipeId}/information?includeNutrition=false&apiKey=${apiKey}`;
  try {
    const response = await axios.get(url);
    return { aggregateLikes: response.data.aggregateLikes };
  } catch (error) {
    return handleApiError(error, fetchInformationById, id, language);
  }
};

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

const fetchInformationById = async (id, language, currency, refreshToken) => {
  const apiKey = getApiKey();

  const createRecipeObject = (data, isFavourite, currency, language) => {
    const pricePerServing = currency
      ? data.pricePerServing
      : parseFloat(data.pricePerServing) + " USD";

    return {
      id: data._id || data.id,
      title: data.title,
      image: data.image,
      diets: data.diets || [],
      instructions: data.instructions,
      extendedIngredients:
        data.extendedIngredients?.map((ingredient) => ingredient.original) ||
        [],
      pricePerServing,
      readyInMinutes:
        data.readyInMinutes + (language == "en" ? " min" : " min"),
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

  const fetchRecipeFromDB = async (id, refreshToken) => {
    const data = await Recipe.findById(id);
    if (!data) throw ApiError.BadRequest("Recipe not found");

    let favourites = [];
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);
      favourites = await FavoriteRecipe.find({ user: user._id });
      handlePaymentStatus(data, user);
    } else {
      handlePaymentStatus(data, {});
    }

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

  const fetchRecipeFromAPI = async (id, language, currency) => {
    const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;

    let favourites = [];
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);
      favourites = await FavoriteRecipe.find({ user: user._id });
    }
    const isFavourite = favourites.some(
      (fav) => fav.recipe.toString() === data.id.toString(),
    );

    if (language !== "en" && language) {
      await handleRecipeTranslation(data, language);
    }
    if (currency) {
      await changeCurrency(data, currency);
    }
    return createRecipeObject(data, isFavourite, currency, language);
  };

  try {
    if (id.length >= 9) {
      return await fetchRecipeFromDB(id, refreshToken);
    } else {
      return await fetchRecipeFromAPI(id, language, currency);
    }
  } catch (error) {
    console.error("Error fetching recipe information:", error);
    return handleApiError(
      error,
      fetchInformationById,
      id,
      language,
      currency,
      refreshToken,
    );
  }
};

const fetchFavoriteRecipes = async (id, language, currency) => {
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
    const favoriteRecipesByDb = await FavoriteRecipe.find({ user: id });

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
