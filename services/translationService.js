const ApiError = require("../middleware/apiError");
const { getApiKey } = require("../config/configApiHandler");
const axios = require("axios").default;
const { Translate } = require("@google-cloud/translate").v2;

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS_GOOGLE);
const translate = new Translate({
  credentials: CREDENTIALS,
  projectId: CREDENTIALS.project_id,
});

/**
 * @desc Handles the API error.
 * @param {Error} error - The error to handle.
 * @param {function} retryFunction - The function to retry.
 * @param {any} args - The arguments to pass to the function.
 * @returns {Promise} The result of the query.
 */
async function handleApiError(error, retryFunction, ...args) {
  if (
    error.response &&
    error.response.status === 404 &&
    error.response.status === 401
  ) {
    getApiKey(true);
    return retryFunction(...args);
  } else {
    throw ApiError.BadRequest(error.message);
  }
}

/**
 * @desc Detects the language of the text.
 * @param {string} text - The text to detect the language.
 * @returns {string} The detected language.
 */
async function detectLanguage(text) {
  const response = await axios.post(
    "https://api-free.deepl.com/v2/translate",
    {
      text,
      target_lang: "en",
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: {
        auth_key: process.env.DEEPL_API_KEY,
      },
      responseType: "json",
    },
  );

  const detectedLanguage =
    response.data.translations[0].detected_source_language;
  return detectedLanguage.toLowerCase();
}

/**
 * @desc Translates the text to the given language.
 * @param {string} text - The text to translate.
 * @param {string} language - The language to translate to.
 * @returns {string} The translated text.
 */
async function translateText(text, language) {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";
  if (!text) return "";

  const [translation] = await translate.translate(text, language);
  return translation;
}

/**
 * @desc Translates the minutes to the given language.
 * @param {string} language - The language to translate to.
 * @returns {string} The translated minutes.
 */
async function translateAndAppendMinutes(language) {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";
  const min = await translateText("min", language);

  return ` ${min}`;
}

/**
 * @desc Translates the recipe fields to the given language.
 * @param {Object} recipe - The recipe to translate.
 * @param {string} language - The language to translate to.
 * @returns {Promise} The translated recipe.
 */
async function translateRecipeFields(recipe, language) {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";

  if (recipe.title) {
    recipe.title = await translateText(recipe.title, language);
  }

  recipe.dishTypes = await Promise.all(
    (recipe.dishTypes || []).map((dishType) =>
      translateText(dishType, language),
    ),
  );
}

/**
 * @desc Translates the recipe information to the given language.
 * @param {Object} recipe - The recipe to translate.
 * @param {string} language - The language to translate to.
 * @returns {Promise} The translated recipe.
 */
async function translateRecipeInformation(recipe, language) {
  if (language == "en" || !language) return recipe;
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";

  const min = await translateAndAppendMinutes(language);

  await translateRecipeFields(recipe, language);
  recipe.readyInMinutes += min;
}

/**
 * @desc Translates the recipe and appends the minutes to the given language.
 * @param {string} recipe - The recipe to translate.
 * @param {string} language - The language to translate to.
 * @returns {Promise} The translated recipe.
 */
async function translateAndAppendMinutesFav(recipe, language) {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";

  recipe = await translateText(recipe, language);
  return recipe;
}

/**
 * @desc Translates the recipe fav information to the given language.
 * @param {Object} recipe - The recipe to translate.
 * @param {string} language - The language to translate to.
 * @returns {Promise} The translated recipe.
 */
async function translateRecipeFavInformation(recipe, language) {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";

  recipe.readyInMinutes = await translateAndAppendMinutesFav(
    recipe.readyInMinutes,
    language,
  );

  await translateRecipeFields(recipe, language);
}

/**
 * @desc Translates the recipe to the given language.
 * @param {Object} recipe - The recipe to translate.
 * @param {string} language - The language to translate to.
 * @returns {Promise}  The translated recipe.
 */
async function translateRecipePost(recipe, language) {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";

  if (language == "en" || !language) {
    return recipe;
  }

  let lang = "en";
  recipe.title = await translateText(recipe.title, lang);
  recipe.instructions = await translateText(recipe.instructions, language);
  if (!language == "en")
    recipe.readyInMinutes += await translateText("min", language);

  if (Array.isArray(recipe.dishTypes)) {
    recipe.dishTypes = await Promise.all(
      recipe.dishTypes.map(async (dishType) => {
        return await translateText(dishType, language);
      }),
    );
  }

  // Similarly, for diets and cuisines
  if (Array.isArray(recipe.diets)) {
    recipe.diets = await Promise.all(
      recipe.diets.map(async (diet) => {
        return await translateText(diet, language);
      }),
    );
  }

  if (Array.isArray(recipe.cuisines)) {
    recipe.cuisines = await Promise.all(
      recipe.cuisines.map(async (cuisine) => {
        return await translateText(cuisine, language);
      }),
    );
  }
  recipe.extendedIngredients = await Promise.all(
    recipe.extendedIngredients.map(async (ingredient) => {
      ingredient.original = await translateText(ingredient.original, language);

      return ingredient;
    }),
  );

  return recipe;
}

/**
 * @desc Translates the recipe to the given language.
 * @param {Object} recipe - The recipe to translate.
 * @param {string} language - The language to translate to.
 * @returns {Promise} The translated recipe.
 */
async function translateRecipeGet(recipe, language) {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";

  if (language == "en" || !language) {
    recipe.readyInMinutes += " min";
    return recipe;
  }

  recipe.title = await translateText(recipe.title, language);
  if (recipe.instructions && recipe.instructions.length > 0)
    recipe.instructions = await translateText(recipe.instructions, language);

  if (!language == "en")
    recipe.readyInMinutes += await translateText("min", language);

  if (Array.isArray(recipe.dishTypes)) {
    recipe.dishTypes = await Promise.all(
      recipe.dishTypes.map(async (dishType) => {
        return await translateText(dishType, language);
      }),
    );
  }

  if (Array.isArray(recipe.diets)) {
    recipe.diets = await Promise.all(
      recipe.diets.map(async (diet) => {
        return await translateText(diet, language);
      }),
    );
  }

  if (Array.isArray(recipe.cuisines)) {
    recipe.cuisines = await Promise.all(
      recipe.cuisines.map(async (cuisine) => {
        return await translateText(cuisine, language);
      }),
    );
  }
  if (recipe.extendedIngredients)
    recipe.extendedIngredients = await Promise.all(
      recipe.extendedIngredients.map(async (ingredient) => {
        ingredient.original = await translateText(
          ingredient.original,
          language,
        );

        return ingredient;
      }),
    );
  return recipe;
}

/**
 * @desc Translates the recipe information to the given language.
 * @param {Object} recipe - The recipe to translate.
 * @param {string} language - The language to translate to.
 * @returns {Promise} The translated recipe.
 */
const TranslateRecipeInformation = async (recipe, language) => {
  if (language == "cz") language = "cs";
  if (language == "ua") language = "uk";
  if (language == "sp") language = "es";
  let translatedRecipe = {};
  for (let key in recipe) {
    if (typeof recipe[key] === "string") {
      translatedRecipe[key] = await translateText(recipe[key], language);
    } else if (Array.isArray(recipe[key])) {
      translatedRecipe[key] = await Promise.all(
        recipe[key].mapa(async (item) => {
          if (typeof item === "string") {
            return await translateText(item, language);
          } else if (typeof item === "object") {
            return await TranslateRecipeInformation(item, language);
          } else {
            return item;
          }
        }),
      );
    } else if (typeof recipe[key] === "object") {
      translatedRecipe[key] = await TranslateRecipeInformation(
        recipe[key],
        language,
      );
    } else {
      translatedRecipe[key] = recipe[key];
    }
  }
  return translatedRecipe;
};

module.exports = {
  translateText,
  handleApiError,
  translateAndAppendMinutes,
  translateRecipeFields,
  translateRecipeInformation,
  TranslateRecipeInformation,
  detectLanguage,
  translateRecipePost,
  translateRecipeGet,
  translateRecipeFavInformation,
};
