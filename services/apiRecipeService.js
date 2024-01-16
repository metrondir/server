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

	let url = `${baseUrl}/complexSearch?apiKey=${apiKey}&query=${query}&number=${limit}&addRecipeNutrition=true`;

	if (type) {
		url += `&type=${type}`;
	 }
  
	 if (diet) {
		url += `&diet=${diet}`;
	 }
  
	 if (maxReadyTime) {
		url += `&maxReadyTime=${maxReadyTime}`;
	 }

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
	let apiKey = getApiKey();
	const url = `${baseUrl}/random?apiKey=${apiKey}&number=${limit}`;
	console.log(url);
	try{
	const response = await axios.get(url);
	
	return response.data.recipes.map(recipe => ({
		id: recipe.id,
		title: recipe.title,
		image: recipe.image,
		readyInMinutes: recipe.readyInMinutes + ' min',
		dishTypes: recipe.dishTypes || [], 
	 }));
	}
	catch(error){
		if (error.response && error.response.status === 404) { 
			getApiKey(true);
			return fetchRandomRecipes(limit);  
		 } else {
			throw error; 
		 }
	}
}

const fetchRecommendedRecipes = async (id) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/similar?apiKey=${apiKey}`;
	try{
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
catch(error){
	if (error.response && error.response.status === 404) { 
		getApiKey(true);
		return fetchRecommendedRecipes(id);  
	 } else {
		throw error; 
	 }
}
}
const fetchInformationById = async (id) => {
	let apiKey = getApiKey();
	const url = `${baseUrl}/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
	try{
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
	catch(error){
		if (error.response && error.response.status === 404) { 
			getApiKey(true);
			return fetchInformationById(id);  
		 } else {
			throw error; 
		 }
	}
	
}

const fetchFavoriteRecipes = async (id) => {
	let apiKey = getApiKey();
	const favoriteRecipes = await FavoriteRecipe.find({ user: id });
	const recipes = await Promise.all(favoriteRecipes.map(async (favoriteRecipe) => {
		const url = `${baseUrl}/${favoriteRecipe.recipe}/information?includeNutrition=false&apiKey=${apiKey}`;
		try{
			const response = await axios.get(url);
			return {
				id: response.data.id,
				title: response.data.title,
				image: response.data.image,
				readyInMinutes: response.data.readyInMinutes + ' min',
				dishTypes: response.data.dishTypes || [], 
			 };
		}
		catch(error){
			if (error.response && error.response.status === 404) { 
				getApiKey(true);
				return fetchFavoriteRecipes(id);  
			 } else {
				throw error; 
			 }
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
 };