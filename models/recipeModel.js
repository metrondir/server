const mongoose = require('mongoose');


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

const recipeSchema = new mongoose.Schema({
  vegetarian: { type: String, enum: ['vegetarian', 'non-vegetarian'] },
  extendedIngredients: [extendedIngredientSchema],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"},
  aggregateLikes:{
        type: Number,
        default: 0,
  },
  pricePerServing: Number,
  id: Number,
  diet: {
    type:Array,
  },
  title: String,
  readyInMinutes: Number,
  image: String,
  cuisines: {
    type: Array

  },
  dishTypes: {
    type: Array
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


module.exports = mongoose.model("Recipe", recipeSchema);


