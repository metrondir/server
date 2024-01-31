const Recipe = require('../models/recipeModel');	
const ApiError = require('../middleware/apiError');
const SpoonacularRecipeModel = require('../models/spoonacularRecipeModel')

const getRecipesFromDatabaseRandom = async (limit, userId) => {
	return await Recipe.aggregate([
	  { $match: { user: { $ne: userId } } },
	  { $sample: { size: Math.floor(limit) } }
	]);
 };

const getSpoonAcularChangedLikeRecipe = async() =>{
	const recipes = await SpoonacularRecipeModel.find();
	return recipes;
}

 const getRecipesByCategories = async (sortDirection, valueSort) => {
	let sortValue = sortDirection === 'desc' ? -1 : 1;
	try{
	if (valueSort === 'time') {
	  valueSort = 'readyInMinutes';
	} else if (valueSort === 'popularity') {
	  valueSort = 'aggregateLikes';
	} else if (valueSort === 'price') {
	  valueSort = 'pricePerServing';
	}
	 const recipes = await Recipe.find().sort({ [valueSort]: sortValue });
	 return recipes;
 }catch(error){
	 console.log(error);
	 throw ApiError.BadRequest(error.message);
	  }
	
 };

 const getRecipesFromDatabaseByIngridients = async (limit, ingredients) => {
	ingredients = ingredients.split(',');
	return await Recipe.aggregate([
	  { $match: { extendedIngredients: { $elemMatch: { original: { $in: ingredients } } } } },
	  { $sample: { size: Math.floor(limit / 2) } }
	]);
 };

 const getRecipesFromDatabaseComplex = async (limit, type, diet, cuisine, maxReadyTime) => {
	const pipeline = [
	  { $match: {} },
	  { $sample: { size: Math.floor(limit / 2) } },
	];
 
	if (type) {
	  pipeline[0].$match.dishTypes = type;
	}
 
	if (diet) {
	  pipeline[0].$match.diets = diet;
	}
 
	if (cuisine) {
	  pipeline[0].$match.cuisines = cuisine;
	}
	if (maxReadyTime) {
	  pipeline[0].$match.readyInMinutes = { $lte: Number(maxReadyTime) };
	}
	try {
	  const recipes = await Recipe.aggregate(pipeline);
	  return recipes;
	}
	catch (error) {
		console.log(error);
		throw ApiError.BadRequest(error.message);
	}

 };

 module.exports = { getRecipesFromDatabaseRandom, getRecipesFromDatabaseByIngridients, getRecipesFromDatabaseComplex,getRecipesByCategories,getSpoonAcularChangedLikeRecipe}