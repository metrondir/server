const asynchHandler = require("express-async-handler");
const CurencyModel = require("../models/curencyModel");

const changeCurrency = asynchHandler(async (recipes, currency) => {
  const price = await CurencyModel.find({ lan: currency });
  console.log(price);
  if (price && price.length > 0 && recipes.length > 1) {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.forEach((recipe) => {
      recipe.pricePerServing *= pricePerDollar;

      recipe.pricePerServing = parseFloat(recipe.pricePerServing.toFixed(2));
      recipe.pricePerServing = `${recipe.pricePerServing} ${price[0].name}`;
    });

    return recipes;
  } else {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.pricePerServing *= pricePerDollar;
    recipes.pricePerServing = parseFloat(recipes.pricePerServing.toFixed(2));

    recipes.pricePerServing = `${recipes.pricePerServing} ${price[0].name}`;

    return recipes;
  }
});

module.exports = { changeCurrency };
