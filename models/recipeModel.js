const mongoose = require("mongoose");

const recipeSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please add the title to this recipe"]
    },
    ingredients: {
        type: String,
        required: [true, "Please add the ingredients to this recipe"]
    },
    // Consider using a URL or path to the image instead of Buffer
    imageUrl: {
        type: String,
        required: [true, "Please add the image URL or path to this recipe"]
    },
    instructions: {
        type: String,
        required: [true, "Please add the instructions to this recipe"]
    },
    // Consider using a numerical data type for cookingTime
    cookingTime: {
        type: Number,
        required: [true, "Please add the cooking time (in minutes) to this recipe"]
    },
    cuisineType: {
        type: String,
        required: [true, "Please add the cuisine type to this recipe"]
    },
   },
   {
     timestamps: true,
   }
);

// Create a model based on the schema
module.exports = mongoose.model("Recipe", recipeSchema);


