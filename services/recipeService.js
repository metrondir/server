const Recipe = require("../models/recipeModel");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const { redisGetModelsWithPaginating, redisGetModels,onDataChanged} = require("../middleware/paginateMiddleware");
const imgur = require('imgur');
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
	if(req.query.page && req.query.limit){
	  return await redisGetModelsWithPaginating(Recipe, req,res,next, { user: req.user.id });
	} else {
	  return await redisGetModels(Recipe, req,res,next, { user: req.user.id });
	}
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
	console.log(recipe)
	recipe.image = imgurLink.link;
	recipe.user = req.user.id;
	recipe = new Recipe(recipe);
 
	await recipe.save();
	onDataChanged('Recipe');
 
	return recipe;
}	
catch(error){
	console.log(error)
	throw ApiError.BadRequest(error.message);	
	
 }
}

 const setFavoriteRecipes = async (req) => {
	const recipeId = req.params.id; 
	const existingFavoriteRecipe = await FavoriteRecipe.findOne({ recipe: recipeId, user: req.user.id });
 
	if (existingFavoriteRecipe) {
	  const favoriteRecipe = await FavoriteRecipe.findByIdAndDelete(existingFavoriteRecipe._id);
	  onDataChanged('Favoriterecipe');
	  return { isDeleted: true, data: favoriteRecipe };
	}
	const favoriteRecipe = new FavoriteRecipe({ recipe: recipeId, user: req.user.id });
	await favoriteRecipe.save();
	onDataChanged('Favoriterecipe');
	return { isDeleted: false, data: favoriteRecipe };
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