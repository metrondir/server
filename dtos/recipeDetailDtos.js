class recipeDetailDto {
  id;
  title;
  image;
  instructions;
  extendedIngredients;
  pricePerServing;
  diets;
  readyInMinutes;
  isFavourite;
  aggregateLikes;
  paymentStatus;

  constructor(model) {
    this.id = model._id || model.id;
    this.title = model.title;
    this.image = model.image;
    this.instructions = model.instructions;
    this.extendedIngredients =
      model.extendedIngredients?.map((ingredient) => ingredient.original) || [];
    this.pricePerServing = model.pricePerServing;
    this.diets = model.diets || [];
    this.readyInMinutes = model.readyInMinutes;
    this.isFavourite = model.isFavourite;
    this.aggregateLikes = model.aggregateLikes;
    this.paymentStatus = model.paymentStatus;
  }
}
class recipeDetailEnDto {
  id;
  title;
  image;
  instructions;
  extendedIngredients;
  pricePerServing;
  diets;
  readyInMinutes;
  isFavourite;
  aggregateLikes;
  paymentStatus;

  constructor(model) {
    this.id = model._id || model.id;
    this.title = model.title;
    this.image = model.image;
    this.instructions = model.instructions;
    this.extendedIngredients =
      model.extendedIngredients?.map((ingredient) => ingredient.original) || [];
    this.pricePerServing = model.pricePerServing;
    this.diets = model.diets || [];
    this.readyInMinutes = model.readyInMinutes + " min";
    this.isFavourite = model.isFavourite;
    this.aggregateLikes = model.aggregateLikes;
    this.paymentStatus = model.paymentStatus;
  }
}

module.exports = { recipeDetailDto, recipeDetailEnDto };
