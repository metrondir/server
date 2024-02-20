const axios = require("axios");
const { baseUrl, getApiKey } = require("../config/configApiHandler");
const FavoriteRecipe = require("../models/favoriteRecipeModel");

const Recipe = require("../models/recipeModel");
const {
  translateText,
  handleApiError,
  translateRecipeInformation,
  detectLanguage,
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

async function fetchRecipesData(response, language) {
  if (language === "en" || !language) {
    return response.map((recipe) => ({
      id: recipe.id || recipe._id,
      title: recipe.title,
      image: recipe.image,
      pricePerServing: parseFloat((recipe.pricePerServing / 100).toFixed(2)),
      readyInMinutes: recipe.readyInMinutes + " min",
      dishTypes: recipe.dishTypes || [],
    }));
  } else {
    await Promise.all(
      response.map((recipe) => translateRecipeInformation(recipe, language)),
    );
    return response.map((recipe) => ({
      id: recipe.id || recipe._id,
      title: recipe.title,
      image: recipe.image,
      pricePerServing: parseFloat((recipe.pricePerServing / 100).toFixed(2)),

      readyInMinutes: recipe.readyInMinutes,
      dishTypes: recipe.dishTypes || [],
    }));
  }
}

const fetchRecipesByIngredients = async (
  ingredients,
  number,
  language,
  currency,
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
    let RandomSample = getRandomSample(
      allRecipes,
      Math.floor(allRecipes.length),
    );
    return Promise.all(
      RandomSample.map(async (recipe) =>
        fetchInformationByRecomended(recipe.id, language, currency),
      ),
    );
  } catch (error) {
    return handleApiError(
      error,
      fetchRecipesByIngredients,
      ingredients,
      language,
      currency,
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
) => {
  let apiKey = getApiKey();
  const lanQuery = await detectLanguage(query);
  if (lanQuery !== "en") {
    query = await translateText(query, "en");
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
    let RandomSample = getRandomSample(
      allRecipes,
      Math.floor(allRecipes.length),
    );
    const recipe = await fetchRecipesData(RandomSample, language);
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
    );
  }
};

const fetchRecipesByCategories = async (
  limit,
  sort,
  sortDirection,
  language,
  currency,
) => {
  let apiKey = getApiKey();
  let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&number=${limit}&sort=${sort}&sortDirection=${sortDirection}&addRecipeNutrition=true`;
  try {
    const response = await axios.get(url);
    if (sort === "time") {
      const recipesByDB = await getRecipesByCategories(sortDirection, sort);
      const allData = response.data.results.concat(recipesByDB);
      const sortDirectionFactor = sortDirection === "desc" ? -1 : 1;
      allData.sort(
        (a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes),
      );
      allData.splice(limit, allData.length - limit);

      const recipe = await fetchRecipesData(allData, language);
      if (currency) return changeCurrency(recipe, currency);
      return recipe;
    }
    if (sort === "popularity") {
      const recipesByDB = await getRecipesByCategories(sortDirection, sort);
      const changeRecipesLike = await getSpoonAcularChangedLikeRecipe();
      response.data.results.forEach((recipe) => {
        if (changeRecipesLike.id == recipe.id) {
          recipe.aggregateLikes = changeRecipesLike.aggregateLikes;
        }
      });
      const allData = response.data.results.concat(recipesByDB);
      const sortDirectionFactor = sortDirection === "desc" ? -1 : 1;
      allData.sort(
        (a, b) => sortDirectionFactor * (a.aggregateLikes - b.aggregateLikes),
      );
      allData.splice(limit, allData.length - limit);

      const recipe = await fetchRecipesData(allData, language);
      if (currency) return changeCurrency(recipe, currency);
      return recipe;
    }
    if (sort === "price") {
      const recipesByDB = await getRecipesByCategories(sortDirection, sort);
      const allData = response.data.results.concat(recipesByDB);
      const sortDirectionFactor = sortDirection === "desc" ? -1 : 1;
      allData.sort(
        (a, b) => sortDirectionFactor * (a.pricePerServing - b.pricePerServing),
      );
      allData.splice(limit, allData.length - limit);
      const recipe = await fetchRecipesData(allData, language);
      if (currency) return changeCurrency(recipe, currency);
      return recipe;
    }
  } catch (error) {
    return handleApiError(
      error,
      fetchRecipesByCategories,
      limit,
      sort,
      sortDirection,
      language,
      currency,
    );
  }
};

const fetchRandomRecipes = async (limit, language, refreshToken, currency) => {
  let apiKey = getApiKey();
  const url = `${baseUrl}/random?apiKey=${apiKey}&number=${limit}`;
  try {
    const response = await axios.get(url);

    if (!refreshToken) {
      const recipes = await getRecipesFromDatabaseRandom(limit);
      const allRecipes = response.data.recipes.concat(recipes);
      let RandomSample = getRandomSample(
        allRecipes,
        Math.floor(allRecipes.length),
      );
      RandomSample = RandomSample.slice(0, limit);
      const recipe = await fetchRecipesData(RandomSample, language);

      if (currency) return changeCurrency(recipe, currency);
      return recipe;
    }
    const user = await findUserByRefreshToken(refreshToken);
    const recipes = await getRecipesFromDatabaseRandomWithUsers(limit, user.id);
    const allRecipes = response.data.recipes.concat(recipes);
    let RandomSample = getRandomSample(
      allRecipes,
      Math.floor(allRecipes.length),
    );
    RandomSample = RandomSample.slice(0, limit);
    const recipe = await fetchRecipesData(RandomSample, language);
    if (currency) return changeCurrency(recipe, currency);
    return recipe;
  } catch (error) {
    return handleApiError(error, fetchRandomRecipes, limit, language, currency);
  }
};

const fetchRecommendedRecipes = async (id, language, currency) => {
  let apiKey = getApiKey();

  const url = `${baseUrl}/${id}/similar?apiKey=${apiKey}`;
  try {
    const response = await axios.get(url);
    const stringId = id.toString();
    if (stringId.length < 7) {
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
};

const fetchInformationByRecomended = async (id, language, currency) => {
  let apiKey = getApiKey();
  const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
  try {
    const response = await axios.get(url);
    if (language === "en" || !language) {
      let recipe = {
        id: response.data.id,
        title: response.data.title,
        dishTypes: response.data.dishTypes || [],
        image: response.data.image,
        readyInMinutes: response.data.readyInMinutes + " min",
        pricePerServing: parseFloat(
          (response.data.pricePerServing / 100).toFixed(2),
        ),
      };

      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    } else {
      await translateRecipeInformation(response.data, language);
      let recipe = {
        id: response.data.id,
        title: response.data.title,
        dishTypes: response.data.dishTypes || [],
        image: response.data.image,
        readyInMinutes: response.data.readyInMinutes,
        pricePerServing: parseFloat(
          (response.data.pricePerServing / 100).toFixed(2),
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

const fetchInformationById = async (id, language, currency) => {
  let apiKey = getApiKey();
  if (id.length >= 8) {
    const data = await Recipe.findById(id);

    if (!data) {
      throw ApiError.BadRequest("Recipe not found");
    }
    const recipe = {
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
    if (currency) return changeCurrency(recipe, currency);

    return recipe;
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
        pricePerServing: parseFloat(
          (response.data.pricePerServing / 100).toFixed(2),
        ),
        cuisines: response.data.cuisines || [],
        dishTypes: response.data.dishTypes || [],
        instructions: response.data.instructions || [],
        diets: response.data.diets || [],
        image: response.data.image,
        readyInMinutes: response.data.readyInMinutes + " min",
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
        pricePerServing: parseFloat(
          (response.data.pricePerServing / 100).toFixed(2),
        ),
        image: response.data.image,
        readyInMinutes: response.data.readyInMinutes,
      };
      if (currency) return changeCurrency(recipe, currency);

      return recipe;
    }
  } catch (error) {
    return handleApiError(error, fetchInformationById, id, language, currency);
  }
};

const fetchFavoriteRecipes = async (id, language, currency) => {
  try {
    const apiKey = getApiKey();

    const allFavoriteRecipes = await FavoriteRecipe.find({ user: id });

    const favoriteRecipes = [];
    const favoriteRecipesByDb = [];

    for (const favoriteRecipe of allFavoriteRecipes) {
      if (favoriteRecipe.recipe.length <= 7) {
        favoriteRecipes.push(favoriteRecipe);
      } else {
        favoriteRecipesByDb.push(favoriteRecipe);
      }
    }

    const recipes = await Promise.all(
      favoriteRecipes.map(async (favoriteRecipe) => {
        const url = `${baseUrl}/${favoriteRecipe.recipe}/information?includeNutrition=false&apiKey=${apiKey}`;
        try {
          const response = await axios.get(url);
          if (language === "en" || !language) {
            const recipe = {
              id: response.data.id,
              title: response.data.title,
              image: response.data.image,
              readyInMinutes: response.data.readyInMinutes + " min",
              pricePerServing: parseFloat(
                (response.data.pricePerServing / 100).toFixed(2),
              ),
              dishTypes: response.data.dishTypes || [],
            };
            if (currency) return changeCurrency(recipe, currency);

            return recipe;
          } else {
            await translateRecipeInformation(response.data, language);
            const recipe = {
              id: response.data.id,
              title: response.data.title,
              image: response.data.image,
              readyInMinutes: response.data.readyInMinutes,
              pricePerServing: parseFloat(
                (response.data.pricePerServing / 100).toFixed(2),
              ),
              dishTypes: response.data.dishTypes || [],
            };
            if (currency) return changeCurrency(recipe, currency);

            return recipe;
          }
        } catch (error) {
          return handleApiError(
            error,
            fetchFavoriteRecipes,
            id,
            language,
            currency,
          );
        }
      }),
    );

    const fetchRecipes = async (recipeIds) => {
      try {
        const fetchedRecipes = await Recipe.find({ _id: recipeIds });
        return fetchedRecipes;
      } catch (error) {
        throw new Error(error);
      }
    };

    const dbRecipes = await Promise.all(
      favoriteRecipesByDb.map(async (favoriteRecipe) => {
        try {
          const fetchedRecipes = await fetchRecipes([favoriteRecipe.recipe]);

          if (fetchedRecipes.length > 0) {
            const fetchedRecipe = fetchedRecipes[0];
            if (language === "en" || !language) {
              const recipe = {
                id: fetchedRecipe.id,
                title: fetchedRecipe.title,
                image: fetchedRecipe.image,
                readyInMinutes: `${fetchedRecipe.readyInMinutes} min`,
                pricePerServing: fetchedRecipe.pricePerServing,
                dishTypes: fetchedRecipe.dishTypes || [],
              };
              if (currency) return changeCurrency(recipe, currency);

              return recipe;
            } else {
              await translateRecipeInformation(fetchedRecipe, language);
              const recipe = {
                id: fetchedRecipe.id,
                title: fetchedRecipe.title,
                image: fetchedRecipe.image,
                pricePerServing: fetchedRecipe.pricePerServing,
                readyInMinutes: fetchedRecipe.readyInMinutes,
                dishTypes: fetchedRecipe.dishTypes || [],
              };
              if (currency) return changeCurrency(recipe, currency);

              return recipe;
            }
          }
        } catch (error) {
          return handleApiError(
            error,
            fetchFavoriteRecipes,
            id,
            language,
            currency,
          );
        }
      }),
    );
    const filteredDbRecipes = dbRecipes.filter((recipe) => recipe);
    return recipes.concat(filteredDbRecipes);
  } catch (error) {
    console.log(error);
    return handleApiError(error, fetchFavoriteRecipes, id, language, currency);
  }
};

const parsedIngredients = async (ingredients) => {
  try {
    console.log(ingredients);
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
