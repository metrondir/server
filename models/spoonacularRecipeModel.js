const mongoose = require("mongoose");

const spoonacularRecipeModel = new mongoose.Schema({
  id: {
    type: String,
    ref: "FavoriteRecipe",
    required: true,
  },
  aggregateLikes: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model(
  "spoonacularRecipeModel",
  spoonacularRecipeModel,
);
