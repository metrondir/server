/**
 * @desc Determines if a recipe ID is from Spoonacular based on its length.
 * @param {string} recipeId - The recipe ID to check.
 * @returns {boolean} - Returns true if the recipe ID is from Spoonacular, false if it is from the database.
 */
function isSpoonacularRecipe(recipeId) {
  return recipeId.length <= 10;
}

module.exports = {
  isSpoonacularRecipe,
};
