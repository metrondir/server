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
  vegetarian: ['vegetarian','non-vegetarian'],
  cheap: ['cheap','expensive'],
  veryPopular: Boolean,
  extendedIngredients: [extendedIngredientSchema],
  id: Number,
  title: String,
  readyInMinutes: Number,
  sourceUrl: String,
  image: {
    data: Buffer,
    contentType: String,
  },
  imageType: String,
  cuisine: String,
  dishType: String,
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


