class recipeDto {
  id;
  title;
  image;
  readyInMinutes;
  diets;
  cuisines;
  dishTypes;
  isFavourite;

  constructor(model) {
    this.id = model._id || model.id;
    this.title = model.title;
    this.image = model.image;
    this.readyInMinutes = model.readyInMinutes;
    this.diets = model.diets || [];
    this.cuisines = model.cuisines || [];
    this.dishTypes = model.dishTypes || [];
    this.isFavourite = model.isFavourite;
  }
}

class recipeEnDto {
  id;
  title;
  image;
  readyInMinutes;
  pricePerServing;
  diets;
  cuisines;
  dishTypes;
  isFavourite;

  constructor(model) {
    this.id = model._id || model.id;
    this.title = model.title;
    this.image = model.image;
    this.readyInMinutes = model.readyInMinutes + " min";
    this.diets = model.diets || [];
    this.pricePerServing = model.pricePerServing;
    this.cuisines = model.cuisines || [];
    this.dishTypes = model.dishTypes || [];
    this.isFavourite = model.isFavourite;
  }
}
class favouriteRecipeEnDto {
  id;
  title;
  image;
  readyInMinutes;
  pricePerServing;
  diets;
  cuisines;
  dishTypes;
  isFavourite;

  constructor(model) {
    this.id = model.recipe;
    this.title = model.title;
    this.image = model.image;
    this.readyInMinutes = model.readyInMinutes + " min";
    this.pricePerServing = model.pricePerServing;
    this.diets = model.diets || [];
    this.cuisines = model.cuisines || [];
    this.dishTypes = model.dishTypes || [];
    this.isFavourite = true;
  }
}
class favouriteRecipeDto {
  id;
  title;
  image;
  readyInMinutes;
  diets;
  cuisines;
  dishTypes;
  isFavourite;

  constructor(model) {
    this.id = model.recipe;
    this.title = model.title;
    this.image = model.image;
    this.readyInMinutes = model.readyInMinutes;
    this.diets = model.diets || [];
    this.cuisines = model.cuisines || [];
    this.dishTypes = model.dishTypes || [];
    this.isFavourite = true;
  }
}
module.exports = {
  recipeDto,
  recipeEnDto,
  favouriteRecipeDto,
  favouriteRecipeEnDto,
};
