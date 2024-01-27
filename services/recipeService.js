const Recipe = require("../models/recipeModel");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const spoonacularRecipeModel = require("../models/spoonacularRecipeModel");
const { redisGetModelsWithPaginating, redisGetModels,onDataChanged} = require("../middleware/paginateMiddleware");
const imgur = require('imgur');
const { parsedIngredients,fetchInformationById } = require("../services/recipesFetchingService");
const { detectLanguage,translateRecipePost } = require("../services/translationService");
const ApiError = require("../middleware/apiError");


const getRecipe = async (req) => {
	const recipe = await Recipe.findById(req.params.id);
	if(!recipe){
	  throw ApiError.BadRequest("Recipe not found");
	}
	return recipe;
 };


 const getRecipes = async (req,res,next) => {
	const recipes = await Recipe.find({ user: req.user.id });
	const updatedRecipes = recipes.map(recipe => ({
	  ...recipe._doc,
	  readyInMinutes: recipe.readyInMinutes + ' min'
	}));
	return updatedRecipes;
 };


 const createRecipe = async (req) => {
	
	if (req.body.extendedIngredients && typeof req.body.extendedIngredients === 'string') {
	  let parsedIngredients = JSON.parse(req.body.extendedIngredients);
	  req.body.extendedIngredients = parsedIngredients;
	}
	
	const imgurLink = await imgur.uploadFile(req.file.path)
	const language = await detectLanguage(req.body.title);
try{
	let recipe = await translateRecipePost(req.body, language)
	const cost = await parsedIngredients(recipe.extendedIngredients);
	recipe.pricePerServing = cost;
	recipe.image = imgurLink.link;
	recipe.user = req.user.id;
	recipe = new Recipe(recipe);
 
	await recipe.save();
	onDataChanged('Recipe');
   console.log(recipe);	
	return recipe;
}	
catch(error){
	console.log(error)
	throw ApiError.BadRequest(error.message);	
	
 }
}

 const setFavoriteRecipes = async (req) => {
	try{
		const recipeId = req.params.id; 
		const existingFavoriteRecipe = await FavoriteRecipe.findOne({ recipe: recipeId, user: req.user.id });
	 
		if (existingFavoriteRecipe) {
			const favoriteRecipe = new FavoriteRecipe({ recipe: recipeId, user: req.user.id });
			await favoriteRecipe.save();
		  return { isDeleted: true, data: favoriteRecipe };
		}
		const favoriteRecipe = new FavoriteRecipe({ recipe: recipeId, user: req.user.id });
		await favoriteRecipe.save();
		onDataChanged('Favoriterecipe');
		return { isDeleted: false, data: favoriteRecipe };
	}catch(error){
		throw ApiError.BadRequest(error.message);
	}
	
 };
 

 const updateRecipe = async (req) => {
	const recipe = await Recipe.findById(req.params.id);
	if(!recipe){
	  throw ApiError.BadRequest("Recipe not found");
	}
 
	if (req.body.extendedIngredients && typeof req.body.extendedIngredients === 'string') {
	  let parsedIngredients = JSON.parse(req.body.extendedIngredients);
	  req.body.extendedIngredients = parsedIngredients;
	}
 
	if (req.file) {
		const imgurLink = await imgur.uploadFile(req.file.path);
		req.body.image = imgurLink.link;
	 }
	const updatedRecipe = await Recipe.findByIdAndUpdate(
		 req.params.id,
		 req.body,
		 {new : true}
	);
	await updatedRecipe.save();
	onDataChanged('Recipe');
	return updatedRecipe;
 };
 

 const deleteRecipe = async (req) => {
	const recipe = await Recipe.findById(req.params.id);
	if (!recipe) {
	  throw ApiError.BadRequest("Recipe not found");
	}
	await Recipe.deleteOne({ _id: req.params.id });
	onDataChanged('Recipe');
	return recipe;
 };


module.exports = {
	getRecipe,
	getRecipes,
	setFavoriteRecipes,
	createRecipe,
	updateRecipe,
	deleteRecipe,
 };