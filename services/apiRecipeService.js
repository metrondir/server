const axios = require('axios');
const ApiError = require("../middleware/apiError");
const { baseUrl, getApiKey } = require('../config/configApiHandler');
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const {Translate} = require('@google-cloud/translate').v2;
const projectId = 'recipes-406419';
const translate = new Translate({projectId});

async function translateText(text) {

	const target = 'uk';

	const [translation] = await translate.translate(text, target);
	console.log(`Text: ${text}`);
	return translation;
 }

 const fetchRecipes = async (query, limit, type, diet, maxReadyTime, language) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/complexSearch?apiKey=${apiKey}&query=${query}&number=${limit}&type=${type}&diet=${diet}&maxReadyTime=${maxReadyTime}&addRecipeNutrition=true`;
	try{
		const response = await axios.get(url);
		return response.data.results.map(recipe => ({
			id: recipe.id,
			title: recipe.title,
			image: recipe.image,
			readyInMinutes: recipe.readyInMinutes + ' min',
			dishTypes: recipe.dishTypes || [], 
		 }));
	}
	catch(error){
		console.log(error);	
		if (error.response && error.response.status === 404) { 
			getApiKey(true);
			return fetchRecipes(query, limit, type, diet, maxReadyTime, language);  
		 } else {
			throw error; 
		 }
	}
	
	//if(language === "en"){
	//	return response.data.results.map(recipe => ({
	//		id: recipe.id,
	//		title: recipe.title,
	//		image: recipe.image,
	//		readyInMinutes: recipe.readyInMinutes + ' min',
	//		dishTypes: recipe.dishTypes || [], 
	//	 }));
	//}
	//else{
	//  return Promise.all(response.data.results.map(async (recipe) => {
	//	 const translatedTitle = await translateText(recipe.title);
	//	 const translatedReadyInMinutes = await translateText(recipe.readyInMinutes + ' min');
	//	 const translatedDishTypes = await Promise.all((recipe.dishTypes || []).map(translateText));
	//	 return {
	//		id: recipe.id,
	//		title: translatedTitle,
	//		image: recipe.image,
	//		readyInMinutes: translatedReadyInMinutes,
	//		dishTypes: translatedDishTypes, 
	//	 };
}
 
 const fetchRandomRecipes = async (limit) => {
	const url = `${baseUrl}/random?apiKey=${getApiKey()}&number=${limit}`;

	const response = await axios.get(url);
	
	return response.data.recipes.map(recipe => ({
		id: recipe.id,
		title: recipe.title,
		image: recipe.image,
		readyInMinutes: recipe.readyInMinutes + ' min',
		dishTypes: recipe.dishTypes || [], 
	 }));
}

const fetchRecommendedRecipes = async (id) => {
	
	const url = `${baseUrl}/${id}/similar?apiKey=${getApiKey()}`;
	const response = await axios.get(url);
	const stringId = id.toString();

	if(stringId.length < 7){
		const data =response.data;
		const recipePromises = data.map(async( recipe) => {
			const recipeData = await fetchInformationById(recipe.id);
			return recipeData;
		});
		const recipes = await Promise.all(recipePromises)
		return recipes.map(recipe => ({
			id: recipe.id,
			title: recipe.title,
			image: recipe.image,
			readyInMinutes: recipe.readyInMinutes,
			dishTypes: recipe.dishTypes || [], 
		 }));
	}
	
}
const fetchInformationById = async (id) => {
	const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${getApiKey()}`;
	const response = await axios.get(url);

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

const fetchFavoriteRecipes = async (id) => {
	const favoriteRecipes = await FavoriteRecipe.find({ user: id });
	const recipes = await Promise.all(favoriteRecipes.map(async (favoriteRecipe) => {
		const url = `${baseUrl}/${favoriteRecipe.recipe}/information?includeNutrition=false&apiKey=${getApiKey()}`;
		const response = await axios.get(url);
		return {
			id: response.data.id,
			title: response.data.title,
			image: response.data.image,
			readyInMinutes: response.data.readyInMinutes + ' min',
			dishTypes: response.data.dishTypes || [], 
		 };
	}));
	return recipes;
}

 

 
  
module.exports = {
	fetchRecipes,
	fetchRandomRecipes,
	fetchRecommendedRecipes,
	fetchInformationById,
	fetchFavoriteRecipes,
 };