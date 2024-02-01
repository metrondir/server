const {Translate} = require('@google-cloud/translate').v2;
const ApiError = require("../middleware/apiError");
const {getApiKey} = require ("../config/configApiHandler")

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS_GOOGLE);
const translate =new Translate({
	credentials: CREDENTIALS,
	projectId: CREDENTIALS.project_id});

async function translateText(text,language) {
	const [translation] = await translate.translate(text, language);
	return translation;
 }



 async function detectLanguage(text) {
	try {
	  const [detections] = await translate.detect(text);
	  if (detections.language) {
		 return detections.language;
	  } else {
		 return null; 
	  }
	} catch (error) {
	  console.error('Error detecting language:', error);
	}
 }

async function translateAndAppendMinutes(language) {
	const min =  await translateText('min', language);
	return ` ${min}`;
 }

async function handleApiError(error, retryFunction, ...args) {
	if (error.response && error.response.status === 404 && error.response.status === 401) {
	  getApiKey(true);
	  return retryFunction(...args);
	} else {
	  throw ApiError.BadRequest(error.message);
	}
 }


 async function translateRecipeFields(recipe, language) {
	
	recipe.title = await translateText(recipe.title, language);
	recipe.dishTypes = await Promise.all((recipe.dishTypes || []).map(dishType => translateText(dishType, language)));

}
 
 async function translateRecipeInformation(recipe, language) {
	const min = await translateAndAppendMinutes(language);
	await translateRecipeFields(recipe, language);
	recipe.readyInMinutes = recipe.readyInMinutes + min;
	
 }

 async function translateRecipePost(recipe, language) {
	if (language === "en" || !language) {
	  return recipe;
	}
	await translateText(recipe.title, language='en');
	
	recipe.instructions = await translateText(recipe.instructions, language='en');
   if (Array.isArray(recipe.dishTypes)) {
		recipe.dishTypes = await Promise.all(recipe.dishTypes.map(async dishType => {
		  return await translateText(dishType, language);
		}));
	 }
	 if (Array.isArray(recipe.cuisines)) {
		recipe.cuisines = await Promise.all(recipe.cuisines.map(async cuisine => {
		  return await translateText(cuisine, language);
		}));
	 }
    if (Array.isArray(recipe.diets)) {
		recipe.diets = await Promise.all(recipe.diets.map(async diet => {
		  return await translateText(diet, language);
		}));
	 }
    recipe.extendedIngredients = await Promise.all(recipe.extendedIngredients.map(async ingredient => {
      ingredient.original = await translateText(ingredient.original, language);
      return ingredient;	
    }
    ));
    return recipe;
}
	


 const TranslateRecipeInformation = async (recipe, language) => {
	let translatedRecipe = {};
	for (let key in recipe) {
	  if (typeof recipe[key] === 'string') {
		 translatedRecipe[key] = await translateText(recipe[key], language);
	  } else if (Array.isArray(recipe[key])) {
		 translatedRecipe[key] = await Promise.all(recipe[key].map(async item => {
			if (typeof item === 'string') {
			  return await translateText(item, language);
			} else if (typeof item === 'object') {
			  return await TranslateRecipeInformation(item, language);
			} else {
			  return item;
			}
		 }));
	  } else if (typeof recipe[key] === 'object') {
		 translatedRecipe[key] = await TranslateRecipeInformation(recipe[key], language);
	  } else {
		 translatedRecipe[key] = recipe[key];
	  }
	}
	return translatedRecipe;
 };

 module.exports = {translateText,translateAndAppendMinutes,handleApiError,translateRecipeFields,translateRecipeInformation,TranslateRecipeInformation,detectLanguage,translateRecipePost};