const axios = require('axios');
const ApiError = require("../middleware/apiError");
const { baseUrl, getApiKey } = require('../config/configApiHandler');

const fetchRecipes = async (query, limit) => {

	const url = `${baseUrl}/complexSearch?apiKey=${getApiKey()}&query=${query}&number=${limit}`;

	const response = await axios.get(url);

	return response.data.results.map(recipe => ({
		id: recipe.id,
		title: recipe.title,
		image: recipe.image,
		readyInMinutes: recipe.readyInMinutes,
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
		readyInMinutes: recipe.readyInMinutes,
		dishTypes: recipe.dishTypes || [], 
	 }));
}

const fetchRecomendedRecipes = async (id) => {
	const url = `${baseUrl}/${id}/similar?apiKey=${getApiKey()}`;
	const response = await axios.get(url);

	return response.data.map(recipe => ({
		id: recipe.id,
		title: recipe.title,
		image: recipe.image,
		readyInMinutes: recipe.readyInMinutes,
		dishTypes: recipe.dishTypes || [], 
	 }));
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
		readyInMinutes: response.data.readyInMinutes,
	 };
	
}


 
module.exports = {
	fetchRecipes,
	fetchRandomRecipes,
	fetchRecomendedRecipes,
	fetchInformationById,
 };