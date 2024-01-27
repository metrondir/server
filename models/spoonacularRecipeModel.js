const mongoose = require('mongoose');

const spoonacularRecipeModel = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'FavoriteRecipe',
		required: true
	},
	aggregateLikes:{
		type: Number,
		required: true
	},
	
});

module.exports = mongoose.model("spoonacularRecipeModel", spoonacularRecipeModel);