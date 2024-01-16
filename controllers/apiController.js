const asyncHandler = require('express-async-handler');
const { fetchRecipes,
	fetchRandomRecipes,
	fetchRecommendedRecipes,
	fetchInformationById,
	fetchFavoriteRecipes,} = require('../services/apiRecipeService');
const ApiError = require('../middleware/apiError');

const getRecipes = asyncHandler(async (req, res, next) =>{
	try{
		const { query, limit,type,diet,maxReadyTime,language } = req.query;
		
		const recipes = await fetchRecipes(query, limit,type,diet,maxReadyTime,language);
		res.status(200).json(recipes);
	}
	catch(error){
		next(error);
	}
  
});

const getRandomRecipes =asyncHandler(async (req, res, next) =>{

	try{
		const { limit } = req.query;
		const recipes = await fetchRandomRecipes(limit);
		res.status(200).json(recipes);
	}
	catch(error){
		next(error);
	}
});

const getInformationById =asyncHandler(async (req, res, next) =>{

	try{
		const { id } = req.params;
		const recipes = await fetchInformationById(id);
		res.status(200).json(recipes);
	}
	catch(error){
		next(error);
	}
});

const getRecommendedRecipes =asyncHandler(async (req, res, next) =>{
	try{
		const { id } = req.params;
		const recipes = await fetchRecommendedRecipes(id);
		res.status(200).json(recipes);
	}
	catch(error){
		next(error);
	}
});

const getFavouriteRecipes =asyncHandler(async (req, res, next) =>{
	try{
		const  id  = req.user.id;
		const recipes = await fetchFavoriteRecipes(id);
		res.status(200).json(recipes);
	}
	catch(error){
		next(error);
	}
});


module.exports = {
	getRecipes,
	getRandomRecipes,
	getInformationById,
	getRecommendedRecipes,
	getFavouriteRecipes,
};