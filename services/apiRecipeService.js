const axios = require('axios');
const { baseUrl, getApiKey } = require('../config/configApiHandler');
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const {Translate} = require('@google-cloud/translate').v2;
const { getRecipesFromDatabaseComplex,getRecipesFromDatabaseRandom,getRecipesFromDatabaseByIngridients } = require('./recipeService')
//const deepl = require('deepl-node');
//const authKey = "a45bd3e2-2f56-321b-aea3-103f0d3cbccf:fx";
//const translator = new deepl.Translator(authKey);
// async function translateTextDeepl(text) {
// const translation = await translator.translateText(text, 'EN', 'UK');
// console.log(`Text DEEPL: ${translation.text}`);
// return translation;
//}

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS_GOOGLE);
const translate =new Translate({
	credentials: CREDENTIALS,
	projectId: CREDENTIALS.project_id});

async function translateText(text,language) {
	console.log(text);
	const [translation] = await translate.translate(text, language);
	return translation;
 }

async function translateAndAppendMinutes(language) {
	const min =  await translateText('min', language);
	return ` ${min}`;
 }

async function handleApiError(error, retryFunction, ...args) {
	if (error.response && error.response.status === 404) {
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

 async function fetchRecipesData(response, language) {
	if (language === "en" || !language) {
	  return response.map(recipe => ({
		 id: recipe.id,
		 title: recipe.title,
		 image: recipe.image,
		 readyInMinutes: recipe.readyInMinutes + ' min',
		 dishTypes: recipe.dishTypes || [],
	  }));
	} else {
	  await Promise.all(response.map(recipe => translateRecipeInformation(recipe, language)));
	  return response.map(recipe => ({
		 id: recipe.id,
		 title: recipe.title,
		 image: recipe.image,
		 readyInMinutes: recipe.readyInMinutes,
		 dishTypes: recipe.dishTypes || [],
	  }));
	}
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

const fetchRecipesByIngredients = async (ingredients,number,language) => {
	let apiKey = getApiKey();
	let url = `${baseUrl}/findByIngredients?apiKey=${apiKey}&ingredients=${ingredients}&number=${number}&ignorePantry=true`;
	try {
	  const response = await axios.get(url);
	  const recipes = await getRecipesFromDatabaseByIngridients(number,ingredients);
	  const allRecipes = response.data.concat(recipes);
	  return Promise.all(allRecipes.map(async recipe => fetchInformationByRecomended(recipe.id, language)));

	} catch (error) {
	  return handleApiError(error, fetchRecipesByIngredients, ingredients, language);
	}
};

 const fetchRecipes = async (query, limit, type, diet,cuisine, maxReadyTime, language) => {
	let apiKey = getApiKey();
	let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&query=${query}&number=${limit/2}&addRecipeNutrition=true`;
	if (type) url += `&type=${type}`;
	if (diet) url += `&diet=${diet}`;
	if(cuisine) url += `&cuisine=${cuisine}`;
	if (maxReadyTime) url += `&maxReadyTime=${maxReadyTime}`;

	try {
	  const response = await axios.get(url);
	  const recipes = await getRecipesFromDatabaseComplex(limit, type, diet, cuisine, maxReadyTime);
	  const allRecipes = response.data.results.concat(recipes);
	  
	  return fetchRecipesData(allRecipes, language);
	} catch (error) {
	  return handleApiError(error, fetchRecipes, query, limit, type, diet, maxReadyTime, language);
	}
 }

 const fetchRandomRecipes = async (limit,language) => {
	let apiKey = getApiKey();
  const url = `${baseUrl}/random?apiKey=${apiKey}&number=${limit}`;
  try {
    const response = await axios.get(url);
	
	 const recipes = await getRecipesFromDatabaseRandom(limit);
	 
	 const allRecipes = response.data.recipes.concat(recipes);
    return fetchRecipesData(allRecipes, language);
  } catch (error) {
    return handleApiError(error, fetchRandomRecipes, limit, language);
  }
}

const fetchRecommendedRecipes = async (id,language) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/similar?apiKey=${apiKey}`;
	try {
	  const response = await axios.get(url);
	  const stringId = id.toString();
	  if (stringId.length < 7) {
		 return Promise.all(response.data.map(async recipe => fetchInformationByRecomended(recipe.id, language)));
	  }
	} catch (error) {
	  return handleApiError(error, fetchRecommendedRecipes, id, language);
	}
}

const fetchInformationByRecomended = async (id,language) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
	try{
		const response = await axios.get(url);
		if(language === "en"|| !language)
		{
			return {
				id: response.data.id,
				title: response.data.title,
				dishTypes: response.data.dishTypes || [],
				image: response.data.image,
				readyInMinutes: response.data.readyInMinutes + ' min',
			 };
			}
			else {
				await translateRecipeInformation(response.data, language);
				return {
				  id: response.data.id,
				  title: response.data.title,
				  dishTypes: response.data.dishTypes || [],
				  image: response.data.image,
				  readyInMinutes: response.data.readyInMinutes,
				};
			}
		}
		catch(error){
			return handleApiError(error, fetchInformationByRecomended, id,language);
		}
	}

const fetchInformationById = async (id,language) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
	try{
		const response = await axios.get(url);
		console.log(response.data);
		if(language === "en"|| !language)
		{
		return {
			id: response.data.id,
			title: response.data.title,
			extendedIngredients: response.data.extendedIngredients || [],
			cuisines: response.data.cuisines || [],
			dishTypes: response.data.dishTypes || [],
			instructions: response.data.instructions || [],
			cheap: response.data.cheap,
			vegetarian: response.data.vegetarian,
			image: response.data.image,
			readyInMinutes: response.data.readyInMinutes + ' min',
		 };
		}
		else {
			await translateRecipeInformation(response.data, language);
			response.data.extendedIngredients = await Promise.all(response.data.extendedIngredients.map(async (ingredient) => {
				ingredient.original = await translateText(ingredient.original,language);
				return ingredient;
			 }));
			response.data.instructions = await translateText(response.data.instructions,language);
			response.data.vegetarian = await translateText(response.data.vegetarian ? "vegetarian" : "non-vegetarian",language);
			response.data.cheap = await translateText(response.data.cheap ? "cheap" : "expensive",language);
			response.data.cuisines = await Promise.all(response.data.cuisines.map(cuisine => translateText(cuisine,language)));
			return {
			  id: response.data.id,
			  title: response.data.title,
			  extendedIngredients: response.data.extendedIngredients,
			  cuisines: response.data.cuisines,
			  dishTypes: response.data.dishTypes,
			  instructions: response.data.instructions,
			  cheap: response.data.cheap,
			  vegetarian: response.data.vegetarian,
			  image: response.data.image,
			  readyInMinutes: response.data.readyInMinutes,
			};
		 }
	  } catch (error) {
		 return handleApiError(error, fetchInformationById, id,language);
	  }
	};

const fetchFavoriteRecipes = async (id,language) => {
	let apiKey = getApiKey();
	const favoriteRecipes = await FavoriteRecipe.find({ user: id });
	const recipes = await Promise.all(favoriteRecipes.map(async (favoriteRecipe) => {
		const url = `${baseUrl}/${favoriteRecipe.recipe}/information?includeNutrition=false&apiKey=${apiKey}`;
		try{
			const response = await axios.get(url);
			if(language === "en"|| !language){
			return {
				id: response.data.id,
				title: response.data.title,
				image: response.data.image,
				readyInMinutes: response.data.readyInMinutes + ' min',
				dishTypes: response.data.dishTypes || [],
			 };
			}
			else{
				await translateRecipeInformation(response.data, language);
				return {
					id: response.data.id,
					title: response.data.title,
					image: response.data.image,
					readyInMinutes: response.data.readyInMinutes,
					dishTypes: response.data.dishTypes || [],
				 };
				}
		}
		catch(error){
			return handleApiError(error, fetchFavoriteRecipes, id,language);
		}
	}));
	return recipes;
}


module.exports = {
	fetchRecipes,
	fetchRandomRecipes,
	fetchRecommendedRecipes,
	fetchInformationById,
	fetchFavoriteRecipes,
	fetchRecipesByIngredients,
	TranslateRecipeInformation,
 };