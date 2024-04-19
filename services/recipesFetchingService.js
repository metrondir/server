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
  getRecipesByCategories,
  getSpoonAcularChangedLikeRecipe,
  getRecipesFromDatabaseRandomWithUsers,
} = require("./databaseRecipeFetchingService");
const { findUserByRefreshToken } = require("./userService");
const { changeCurrency } = require("./changeCurrencyRecipesService");

const getRandomSample = (array, size) => {
  const shuffled = array.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
};

async function markFavorites(allRecipes, userId) {
  const favourites = await FavoriteRecipe.find({ user: userId });

  allRecipes.map((item) => {
    if ((item && item.id) || item._id) {
      const isFavoriteRecipe = favourites.some((recipe) => {
        const recipeId = recipe.recipe && recipe.recipe.toString();
        const itemId = item.id && item.id.toString();
        const itemObjectId = item._id && item._id.toString();

        return recipeId === itemId || recipeId === itemObjectId;
      });

      item.isFavourite = isFavoriteRecipe;
    }
  });

  return allRecipes;
}
async function fetchRecipesData(response, language, currency) {
  if (language === "en" || !language) {
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
}

const fetchRecipesByIngredients = async (
  number,
  language,
  currency,
  refreshToken,
  ingredients,
) => {
  let apiKey = getApiKey();
  const lanIngredients = await detectLanguage(ingredients);
  if (lanIngredients !== "en") {
    ingredients = await translateText(ingredients, "en");
  }
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
        fetchInformationByRecomended(
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

const fetchRecipes = async (
  query,
  limit,
  type,
  diet,
  cuisine,
  maxReadyTime,
  language,
  currency,
  refreshToken,
) => {
  let apiKey = getApiKey();
  const lanQuery = await detectLanguage(query);
  if (query) {
    if (lanQuery !== "en") {
      query = await translateText(query, "en");
    }
  }
  let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&query=${query}&number=${limit}&addRecipeNutrition=true`;
  if (type) url += `&type=${type}`;
  if (diet) url += `&diet=${diet}`;
  if (cuisine) url += `&cuisine=${cuisine}`;
  if (maxReadyTime) url += `&maxReadyTime=${maxReadyTime}`;
  try {
    const response = await axios.get(url);
    const recipes = await getRecipesFromDatabaseComplex(
      query,
      limit,
      type,
      diet,
      cuisine,
      maxReadyTime,
    );
    let allRecipes = response.data.results.concat(recipes);
    allRecipes.splice(limit, allRecipes.length - limit);
    if (refreshToken) {
      const user = await findUserByRefreshToken(refreshToken);
      await markFavorites(allRecipes, user._id);
    }
    let RandomSample = getRandomSample(
      allRecipes,
      Math.floor(allRecipes.length),
    );
    const recipe = await fetchRecipesData(RandomSample, language, currency);
    if (currency) return changeCurrency(recipe, currency);
    return recipe;
  } catch (error) {
    return handleApiError(
      error,
      fetchRecipes,
      query,
      limit,
      type,
      diet,
      maxReadyTime,
      language,
      currency,
      refreshToken,
    );
  }
};

const fetchRecipesByCategories = async (
  query,
  limit,
  sort,
  sortDirection,
  language,
  currency,
  refreshToken,
) => {
  let apiKey = getApiKey();

  //check if query exist when user whant specific category like the most popular burger
  if (query) {
    const lanQuery = await detectLanguage(query); // if query is another language than english
    if (lanQuery !== "en") {
      query = await translateText(query, "en"); // we translate this query to en to create a request to the api
    }
    url += `&query=${query}`;
  }
  let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&number=${limit}&sort=${sort}&sortDirection=${sortDirection}&addRecipeNutrition=true`;

  try {
    const response = await axios.get(url);
    if (sort === "time") {
      const recipesByDB = await getRecipesByCategories(
        sortDirection,
        sort,
        query,
      );
      const allData = response.data.results.concat(recipesByDB);
      if (refreshToken) {
        const user = await findUserByRefreshToken(refreshToken);
        await markFavorites(allData, user._id);
      }
      const sortDirectionFactor = sortDirection === "desc" ? -1 : 1;
      allData.sort(
        (a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes),
      );
      allData.splice(limit, allData.length - limit);

      const recipe = await fetchRecipesData(allData, language, currency);
      if (currency) return changeCurrency(recipe, currency);
      return recipe;
    }
    if (sort === "popularity") {
      const recipesByDB = await getRecipesByCategories(
        sortDirection,
        sort,
        query,
      );
      const changeRecipesLike = await getSpoonAcularChangedLikeRecipe(
        limit,
        sortDirection,
      );
      changeRecipesLike.map((change) => {
        response.data.results.map((recipe) => {
          if (change.id == recipe.id) {
            recipe.aggregateLikes = change.aggregateLikes;
          }
        });
      });

      const allData = response.data.results.concat(recipesByDB);
      if (refreshToken) {
        const user = await findUserByRefreshToken(refreshToken);
        await markFavorites(allData, user._id);
      }
      const sortDirectionFactor = sortDirection === "desc" ? -1 : 1;
      allData.sort(
        (a, b) => sortDirectionFactor * (a.aggregateLikes - b.aggregateLikes),
      );
      allData.splice(limit, allData.length - limit);

      const recipe = await fetchRecipesData(allData, language, currency);
      if (currency) return changeCurrency(recipe, currency);
      return recipe;
    }
    if (sort === "price") {
      const recipesByDB = await getRecipesByCategories(
        sortDirection,
        sort,
        query,
      );
      const allData = response.data.results.concat(recipesByDB);
      if (refreshToken) {
        const user = await findUserByRefreshToken(refreshToken);
        await markFavorites(allData, user._id);
      }
      const sortDirectionFactor = sortDirection === "desc" ? -1 : 1;
      allData.sort(
        (a, b) => sortDirectionFactor * (a.pricePerServing - b.pricePerServing),
      );
      allData.splice(limit, allData.length - limit);
      const recipe = await fetchRecipesData(allData, language, currency);
      if (currency) return changeCurrency(recipe, currency);
      return recipe;
    }
  } catch (error) {
    return handleApiError(
      error,
      fetchRecipesByCategories,
      query,
      limit,
      sort,
      sortDirection,
      language,
      currency,
      refreshToken,
    );
  }
};

const fetchRandomRecipes = async (limit, language, refreshToken, currency) => {
  let apiKey = getApiKey();
  console.log("refreshToken", refreshToken);
  const url = `${baseUrl}/random?apiKey=${apiKey}&number=${limit}`;
  try {
    const response = await axios.get(url);

    if (!refreshToken) {
      const recipes = await getRecipesFromDatabaseRandom(limit);
      const allRecipes = response.data.recipes.concat(recipes);

      const filteredRecipes = allRecipes.filter(
        (recipe) => !!recipe.instructions,
      );
      const recipe = await fetchRecipesData(
        filteredRecipes,
        language,
        currency,
      );
      let RandomSample = getRandomSample(recipe, Math.floor(recipe.length));
      RandomSample = RandomSample.slice(0, limit);
      if (currency) return changeCurrency(RandomSample, currency);
      return RandomSample;
    }

    // if refresh token exist we get the recipes from the database with the user id
    const user = await findUserByRefreshToken(refreshToken);

    const recipes = await getRecipesFromDatabaseRandomWithUsers(limit, user.id);
    const allRecipes = response.data.recipes.concat(recipes);

    await markFavorites(allRecipes, user._id);
    const filteredRecipes = allRecipes.filter(
      (recipe) => !!recipe.instructions,
    );
    const recipe = await fetchRecipesData(filteredRecipes, language, currency);
    let RandomSample = getRandomSample(recipe, Math.floor(recipe.length));
    RandomSample = RandomSample.slice(0, limit);
    if (currency) return changeCurrency(RandomSample, currency);
    return RandomSample;
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
            fetchInformationByRecomended(recipe.id, language, currency),
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

const fetchInformationByRecomended = async (
  id,
  language,
  currency,
  refreshToken,
) => {
  let apiKey = getApiKey();

  let favourites = [];
  if (refreshToken) {
    const user = await findUserByRefreshToken(refreshToken);
    favourites = await FavoriteRecipe.find({ user: user._id });
  }
  const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
  try {
    const response = await axios.get(url);
    if (!response.data || !response.data.instructions) {
      return;
    }
    const recipeData = response.data;
    if (language === "en" || !language) {
      let recipe = {
        id: recipeData.id,
        title: recipeData.title,
        dishTypes: recipeData.dishTypes || [],
        image: recipeData.image,
        readyInMinutes: recipeData.readyInMinutes + " min",

        pricePerServing: !currency
          ? parseFloat((recipeData.pricePerServing / 100).toFixed(2)) + " USD"
          : parseFloat((recipeData.pricePerServing / 100).toFixed(2)),
        isFavourite: favourites.some(
          (fav) => fav.recipe.toString() === recipeData.id.toString(),
        ),
      };

      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    } else {
      await translateRecipeInformation(response.data, language);
      if (!response.data || !response.data.instructions) {
        return;
      }

      const recipeData = response.data;
      const recipe = {
        id: recipeData.id,
        title: recipeData.title,
        dishTypes: recipeData.dishTypes || [],
        image: recipeData.image,
        readyInMinutes: recipeData.readyInMinutes,

        pricePerServing: !currency
          ? parseFloat((recipeData.pricePerServing / 100).toFixed(2)) + " USD"
          : parseFloat((recipeData.pricePerServing / 100).toFixed(2)),
        isFavourite: favourites.some(
          (fav) => fav.recipe.toString() === recipeData.id.toString(),
        ),
      };

      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    }
  } catch (error) {
    return handleApiError(
      error,
      fetchInformationByRecomended,
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

const fetchInformationById = async (id, language, currency, refreshToken) => {
  let apiKey = getApiKey();
  let favourites = [];
  const user = await findUserByRefreshToken(refreshToken);
  favourites = await FavoriteRecipe.find({ user: user._id });

  if (id.length >= 9) {
    const data = await Recipe.findById(id);
    if (data.paymentInfo.paymentStatus) {
      if (
        user.boughtRecipes.includes(data._id.toString()) &&
        user.boughtRecipes !== undefined
      ) {
      } else {
        delete data.instructions;
        delete data.analyzedInstructions;
        delete data.extendedIngredients;
      }
    }

    if (!data) {
      throw ApiError.BadRequest("Recipe not found");
    }

    if (language === "en" || !language) {
      const recipe = {
        id: data.id,
        title: data.title,
        image: data.image,
        diets: data.diets || [],
        instructions: data?.instructions,
        extendedIngredients:
          data.extendedIngredients.map((ingredient) => ingredient.original) ||
          [],
        pricePerServing: !currency
          ? parseFloat(data.pricePerServing) + " USD"
          : parseFloat(data.pricePerServing),
        readyInMinutes: data.readyInMinutes + " min",
        dishTypes: data.dishTypes || [],
        aggregateLikes: data.aggregateLikes,
        isFavourite: favourites.some(
          (fav) => fav.recipe.toString() === data.id.toString(),
        ),
      };

      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    } else {
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
      const min = await translateText(" min", language);

      const recipe = {
        id: data.id,
        title: data.title,
        extendedIngredients:
          data.extendedIngredients.map((ingredient) => ingredient.original) ||
          [],
        cuisines: data.cuisines,
        diets: data.diets,
        dishTypes: data.dishTypes,
        instructions: data.instructions,
        pricePerServing: !currency
          ? parseFloat(data.pricePerServing) + " USD"
          : parseFloat(data.pricePerServing),
        image: data.image,
        readyInMinutes: data.readyInMinutes + min,
        aggregateLikes: data.aggregateLikes,
        isFavourite: favourites.some(
          (fav) => fav.recipe.toString() === data.id.toString(),
        ),
      };
      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    }
  }
  const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
  try {
    const response = await axios.get(url);
    if (language === "en" || !language) {
      const recipe = {
        id: response.data.id,
        title: response.data.title,
        extendedIngredients:
          response.data.extendedIngredients.map(
            (ingredient) => ingredient.original,
          ) || [],
        pricePerServing: !currency
          ? parseFloat((response.data.pricePerServing / 100).toFixed(2)) +
            " USD"
          : parseFloat((response.data.pricePerServing / 100).toFixed(2)),
        cuisines: response.data.cuisines || [],
        dishTypes: response.data.dishTypes || [],
        instructions: response.data.instructions || [],
        diets: response.data.diets || [],
        image: response.data.image,
        readyInMinutes: response.data.readyInMinutes + " min",
        aggregateLikes: response.data.aggregateLikes,
        isFavourite: favourites.some(
          (fav) => fav.recipe.toString() === response.data.toString(),
        ),
      };
      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    } else {
      await translateRecipeInformation(response.data, language);
      response.data.extendedIngredients = await Promise.all(
        response.data.extendedIngredients.map(async (ingredient) => {
          ingredient.original = await translateText(
            ingredient.original,
            language,
          );
          return ingredient.original;
        }),
      );

      response.data.diets = await Promise.all(
        response.data.diets.map((diet) => translateText(diet, language)),
      );
      response.data.instructions = await translateText(
        response.data.instructions,
        language,
      );
      response.data.cuisines = await Promise.all(
        response.data.cuisines.map((cuisine) =>
          translateText(cuisine, language),
        ),
      );

      const recipe = {
        id: response.data.id,
        title: response.data.title,
        extendedIngredients: response.data.extendedIngredients,
        cuisines: response.data.cuisines,
        diets: response.data.diets,
        dishTypes: response.data.dishTypes,
        instructions: response.data.instructions,
        pricePerServing: !currency
          ? parseFloat((response.data.pricePerServing / 100).toFixed(2)) +
            " USD"
          : parseFloat((response.data.pricePerServing / 100).toFixed(2)),
        image: response.data.image,
        readyInMinutes: response.data.readyInMinutes,
        aggregateLikes: response.data.aggregateLikes,
        isFavourite: favourites.some(
          (fav) => fav.recipe.toString() === response.data.id.toString(),
        ),
      };
      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    }
  } catch (error) {
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

const parsedIngredients = async (ingredients) => {
  try {
    const apiKey = getApiKey();
    const url = `${baseUrl}/parseIngredients?includeNutrition=false&apiKey=${apiKey}`;

    const ingredientList = ingredients.map((item) => item.original).join("\n");

    const formData = new URLSearchParams();
    formData.append("ingredientList", ingredientList);

    const response = await axios.post(url, formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    let totalEstimatedCost = response.data.reduce((total, item) => {
      return total + item.estimatedCost.value;
    }, 0);

    totalEstimatedCost = parseFloat((totalEstimatedCost / 100).toFixed(2));

    return totalEstimatedCost;
  } catch (error) {
    throw new Error(
      "Check naming of ingridients, maybe u type wrong ,we cant create for this recipe price",
    );
  }
};

const fetchFavoriteRecipes = async (id, language, currency) => {
  try {
    const favoriteRecipesByDb = await FavoriteRecipe.find({ user: id });
    const allFavoriteRecipes = await Promise.all(
      favoriteRecipesByDb.map(async (fetchedRecipe) => {
        try {
          let recipe;
          if (language === "en" || !language) {
            recipe = {
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
            };

            if (currency) return changeCurrency(recipe, currency);
          } else {
            await translateRecipeFavInformation(fetchedRecipe, language);
            recipe = {
              id: fetchedRecipe.recipe,
              title: fetchedRecipe.title,
              image: fetchedRecipe.image,
              cuisine: fetchedRecipe.cuisines || [],
              instructions: fetchedRecipe.instructions,
              pricePerServing: !currency
                ? parseFloat(fetchedRecipe.pricePerServing) + " USD"
                : parseFloat(fetchedRecipe.pricePerServing),
              readyInMinutes: fetchedRecipe.readyInMinutes,
              dishTypes: fetchedRecipe.dishTypes || [],
            };

            if (currency) return changeCurrency(recipe, currency);
          }

          return recipe;
        } catch (error) {
          throw new Error(error);
        }
      }),
    );

    return allFavoriteRecipes;
  } catch (error) {
    throw new Error(error);
  }
};
module.exports = {
  fetchRecipes,
  fetchRandomRecipes,
  fetchRecommendedRecipes,
  fetchInformationById,
  fetchFavoriteRecipes,
  fetchRecipesByIngredients,
  fetchRecipesByCategories,
  parsedIngredients,
  fetchAggregateLikesById,
};
