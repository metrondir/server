const asynchHandler = require("express-async-handler");
const CurencyModel = require("../models/curencyModel");

const changeCurrency = asynchHandler(async (recipes, currency) => {
  const price = await CurencyModel.find({ lan: currency });

  if (price && price.length > 0 && recipes.length > 1) {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.forEach((recipe) => {
      recipe.pricePerServing *= pricePerDollar;

      recipe.pricePerServing = parseFloat(recipe.pricePerServing.toFixed(2));
    });

    return recipes;
  } else {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.pricePerServing *= pricePerDollar;
    recipes.pricePerServing = parseFloat(recipes.pricePerServing.toFixed(2));

    return recipes;
  }
});

module.exports = { changeCurrency };
