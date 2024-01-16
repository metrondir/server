const axios = require('axios');
const ApiError = require("../middleware/apiError");
const { baseUrl, getApiKey } = require('../config/configApiHandler');
const FavoriteRecipe = require("../models/favoriteRecipeModel");

const fetchRecipes = async (query, limit) => {

	const url = `${baseUrl}/complexSearch?apiKey=${getApiKey()}&query=${query}&number=${limit}&addRecipeNutrition=true`;
	const response = await axios.get(url);
	console.log(response);
	return response.data.results.map(recipe => ({
		id: recipe.id,
		title: recipe.title,
		image: recipe.image,
		readyInMinutes: recipe.readyInMinutes + ' min',
		dishTypes: recipe.dishTypes || [], 
	 }));
 };

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
			readyInMinutes: recipe.readyInMinutes + ' min',
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