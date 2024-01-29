const mongoose = require('mongoose');

const favoriteRecipeSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	recipe:{
		type: String,
		required: true
	},
	
});

module.exports = mongoose.model('FavoriteRecipe', favoriteRecipeSchema)
