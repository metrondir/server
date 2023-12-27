const mongoose = require('mongoose');

const favoriteRecipeSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	recipe:{
		type: mongoose.Schema.Types.ObjectId,
		required: true
	},
	
});

const FavoriteRecipe = mongoose.model('FavoriteRecipe', favoriteRecipeSchema);

module.exports = FavoriteRecipe;
