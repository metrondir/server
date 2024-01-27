const axios = require('axios');

const { baseUrl, getApiKey } = require('../config/configApiHandler');
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const { translateText,handleApiError,translateRecipeInformation, detectLanguage, } = require('./translationService');
const {  getRecipesFromDatabaseRandom, getRecipesFromDatabaseByIngridients, getRecipesFromDatabaseComplex,getRecipesByCategories} =  require('./databaseRecipeFetchingService');
const { findToken } = require('./tokenService');

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
	const lanQuery = await detectLanguage(query);
	if (lanQuery !== "en") {
	  query = await translateText(query, "en");
	}
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

 const fetchRecipesByCategories = async (limit, sort, sortDirection, language) => {
	let apiKey = getApiKey();
	
	let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&number=${limit}&sort=${sort}&sortDirection=${sortDirection}&addRecipeNutrition=true`;
	try {
		const response = await axios.get(url);
		console.log(response.data.results);
		if(sort === "time")
	{
		const recipesByDB = await	getRecipesByCategories(sortDirection,sort);
		const allData = response.data.results.concat(recipesByDB);
		const sortDirectionFactor = sortDirection === 'desc' ? -1 : 1;
		allData.sort((a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes));
		allData.splice(limit,allData.length-limit);
		return fetchRecipesData(allData, language);
	}
	if(sort === "popularity"){
		const recipesByDB = await	getRecipesByCatagories(sortDirection,sort);
		const allData = response.data.results.concat(recipesByDB);
		const sortDirectionFactor = sortDirection === 'desc' ? -1 : 1;
		allData.sort((a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes));
		allData.splice(limit,allData.length-limit);
		return fetchRecipesData(allData, language);
	}
	if(sort === "price"){
		const recipesByDB = await	getRecipesByCatagories(sortDirection,sort);
		const allData = response.data.results.concat(recipesByDB);
		const sortDirectionFactor = sortDirection === 'desc' ? -1 : 1;
		allData.sort((a, b) => sortDirectionFactor * (a.readyInMinutes - b.readyInMinutes));
		allData.splice(limit,allData.length-limit);
		return fetchRecipesData(allData, language);
	}	
	} catch (error) {
	  return handleApiError(error, fetchRecipesBySort, limit, sort, sortDirection, language);
	}
};

 const fetchRandomRecipes = async (limit,language,refreshToken) => {
	let apiKey = getApiKey();
  const url = `${baseUrl}/random?apiKey=${apiKey}&number=${limit}`;
  try {
    const response = await axios.get(url);
	 const findtoken = await findToken(refreshToken);

	 const recipes = await getRecipesFromDatabaseRandom(limit,findToken.user);
	 
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

const parsedIngredients = async (ingredients) => {
	try {
	  const apiKey = getApiKey();
	  console.log(ingredients);
 
	  const url = `${baseUrl}/parseIngredients?includeNutrition=false&apiKey=${apiKey}`;
	  
	  const ingredientList = ingredients.map(item => item.original);
	  console.log(ingredientList);
 
	  const requestData = ingredientList.map((ingredient, index) => `ingredientList[${index}]=${ingredient}`).join('&');
 
	  const response = await axios.post(
		 url,
		 requestData,
		 {
			headers: {
			  'Content-Type: application/json': 'charset=utf-8',
			},
		 }
	  );
 
	  // Assuming response.data contains the expected structure
	  return response.data.pricePerServing;
	} catch (error) {
	  console.error('Error while parsing ingredients:', error);
	  throw error; // Re-throw the error to handle it at the higher level if needed
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
};
