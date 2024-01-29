const Recipe = require("../models/recipeModel");
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const SpoonacularRecipeModel = require("../models/spoonacularRecipeModel");
const imgur = require('imgur');
const { parsedIngredients,fetchAggregateLikesById } = require("../services/recipesFetchingService");
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
	return recipe;
}	
catch(error){
	console.log(error)
	throw ApiError.BadRequest(error.message);	
	
 }
}

const setFavoriteRecipes = async (req) => {
	try {
		 const recipeId = req.params.id;
		
		 const existingFavoriteRecipe = await FavoriteRecipe.findOne({ recipe: recipeId, user: req.user.id });
		 const existedSpoonacularRecipe = await SpoonacularRecipeModel.findOne({ id: recipeId });

		 if (existingFavoriteRecipe) {
			  const deletedFavoriteRecipe = await deleteFavoriteRecipe(existingFavoriteRecipe, recipeId, existedSpoonacularRecipe);
			  return { isDeleted: true, data: deletedFavoriteRecipe };
		 }

		 const newFavoriteRecipe = new FavoriteRecipe({ recipe: recipeId, user: req.user.id });
		 await newFavoriteRecipe.save();

		 await updateRecipeLikes(recipeId, existedSpoonacularRecipe);

		 return { isDeleted: false, data: newFavoriteRecipe };
	} catch (error) {
		 console.error(error);
		 throw ApiError.BadRequest("Recipe not found");
	}
};

const deleteFavoriteRecipe = async (existingFavoriteRecipe, recipeId, existedSpoonacularRecipe) => {
	const deletedFavoriteRecipe = await FavoriteRecipe.findByIdAndDelete(existingFavoriteRecipe._id);
	const likes = await fetchAggregateLikesById(recipeId);

	if (recipeId >= 7) {
		 await updateSpoonacularRecipeLikes(existedSpoonacularRecipe, recipeId, likes - 1);
	} else {
		 await updateRecipeLikes(recipeId, null, -1);
	}

	return deletedFavoriteRecipe;
};

const updateRecipeLikes = async (recipeId, existedSpoonacularRecipe, likesDelta = 1) => {
	if (recipeId >= 7) {
		 await updateSpoonacularRecipeLikes(existedSpoonacularRecipe, recipeId, likesDelta);
	} else {
		 const recipe = await Recipe.findById(recipeId);
		 recipe.aggregateLikes += likesDelta;
		 await recipe.save();
	}
};

const updateSpoonacularRecipeLikes = async (existedSpoonacularRecipe, recipeId, likesDelta) => {
	if (existedSpoonacularRecipe) {
		 existedSpoonacularRecipe.aggregateLikes += likesDelta;
		 await existedSpoonacularRecipe.save();
	} else {
		 const likes = await fetchAggregateLikesById(recipeId);
		 
		 const spoonacularRecipe = new SpoonacularRecipeModel({ id: recipeId, aggregateLikes: likes.aggregateLikes + likesDelta });
		 await spoonacularRecipe.save();
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

	return updatedRecipe;
 };
 

 const deleteRecipe = async (req) => {
	const recipe = await Recipe.findById(req.params.id);
	if (!recipe) {
	  throw ApiError.BadRequest("Recipe not found");
	}
	await Recipe.deleteOne({ _id: req.params.id });

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