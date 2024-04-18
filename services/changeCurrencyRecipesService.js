const asynchHandler = require("express-async-handler");
const CurencyModel = require("../models/curencyModel");
const RecipeModel = require("../models/recipeModel");

const changeCurrency = asynchHandler(async (recipes, currency) => {
  const price = await CurencyModel.find({ lan: currency });
  if (price && price.length > 0 && recipes.length > 1) {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.forEach((recipe) => {
      recipe.pricePerServing *= pricePerDollar;

      recipe.pricePerServing = parseFloat(recipe.pricePerServing.toFixed(2));
      recipe.pricePerServing = `${recipe.pricePerServing} ${price[0].name}`;
    });
    console.log(recipes);
    return recipes;
  } else {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.pricePerServing *= pricePerDollar;
    recipes.pricePerServing = parseFloat(recipes.pricePerServing.toFixed(2));

    recipes.pricePerServing = `${recipes.pricePerServing} ${price[0].name}`;

    return recipes;
  }
});

const changeCurrencyForPayment = asynchHandler(async (id, currency) => {
  const price = await CurencyModel.find({ name: currency });
  const recipe = await RecipeModel.findById(id);
  const pricePerDollar = price[0].pricePerDollar;

  return parseFloat((recipe.paymentInfo.price * pricePerDollar).toFixed(2));
});
module.exports = { changeCurrency, changeCurrencyForPayment };
