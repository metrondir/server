const mongoose = require("mongoose");

//const favoriteRecipeSchema = new mongoose.Schema({
//  user: {
//    type: mongoose.Schema.Types.ObjectId,
//    ref: "User",
//    required: true,
//  },
//  recipe: {
//    type: String,
//    required: true,
//  },
//});

const extendedIngredientSchema = new mongoose.Schema({
  id: Number,
  original: String,
  originalName: String,
  amount: Number,
  meta: [String],
  measures: {
    us: {
      amount: Number,
      unitShort: String,
      unitLong: String,
    },
    metric: {
      amount: Number,
      unitShort: String,
      unitLong: String,
    },
  },
});

const favoriteRecipeSchema = new mongoose.Schema({
  vegetarian: { type: String, enum: ["vegetarian", "non-vegetarian"] },
  extendedIngredients: [String],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipe: {
    type: String,
    required: true,
  },

  aggregateLikes: {
    type: Number,
    default: 0,
  },
  pricePerServing: String,
  diets: {
    type: Array,
  },
  title: String,
  readyInMinutes: String,
  image: String,
  cuisines: {
    type: Array,
  },
  dishTypes: {
    type: Array,
  },
  instructions: String,
  analyzedInstructions: [
    {
      name: String,
      steps: [
        {
          number: Number,
          step: String,
          ingredients: [
            {
              id: Number,
              name: String,
              localizedName: String,
              image: String,
            },
          ],
          equipment: [
            {
              id: Number,
              name: String,
              localizedName: String,
              image: String,
              temperature: {
                number: Number,
                unit: String,
              },
            },
          ],
          length: {
            number: Number,
            unit: String,
          },
        },
      ],
    },
  ],
});

module.exports = mongoose.model("FavoriteRecipe", favoriteRecipeSchema);
