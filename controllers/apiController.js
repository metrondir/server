const asyncHandler = require('express-async-handler');
const { fetchRecipes,
	fetchRandomRecipes,
	fetchRecomendedRecipes,
	fetchInformationById,} = require('../services/apiRecipeService');
const ApiError = require('../middleware/apiError');

const getRecipes = asyncHandler(async (req, res, next) =>{
	try{
		const { query, limit } = req.query;
		const recipes = await fetchRecipes(query, limit);
		res.status(200).json(recipes);
	}
	catch(error){
		throw ApiError.BadRequest("Recipe not found");
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

const getRecomendedrecipes =asyncHandler(async (req, res, next) =>{
	try{
		const { id } = req.params;
		const recipes = await fetchRecomendedRecipes(id);
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
	getRecomendedrecipes,
};