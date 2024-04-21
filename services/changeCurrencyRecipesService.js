const asynchHandler = require("express-async-handler");
const CurencyModel = require("../models/curencyModel");
const RecipeModel = require("../models/recipeModel");

const changeCurrency = asynchHandler(async (recipes, currency) => {
  const price = await CurencyModel.find({ lan: currency });
  if (price && price.length > 0 && recipes.length > 1) {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.forEach((recipe) => {
      if (typeof recipe.pricePerServing === "string") {
        let numericPart = recipe.pricePerServing.match(/\d+\.\d+/);
        if (numericPart) {
          recipe.pricePerServing = parseFloat(numericPart[0]);
        }
      }

      recipe.pricePerServing *= pricePerDollar;

      recipe.pricePerServing = parseFloat(recipe.pricePerServing.toFixed(2));
      recipe.pricePerServing = `${recipe.pricePerServing} ${price[0].name}`;
      if (!recipe.paymentInfo) return recipes;
      recipe.paymentInfo.price *= pricePerDollar;
      recipe.paymentInfo.price = parseFloat(
        recipe.paymentInfo.price.toFixed(2),
      );
      recipe.paymentInfo.price = `${recipe.paymentInfo.price} ${price[0].name}`;
    });

    return recipes;
  } else {
    const pricePerDollar = price[0].pricePerDollar;

    recipes[0].pricePerServing *= pricePerDollar;

    recipes[0].pricePerServing = parseFloat(
      recipes[0].pricePerServing.toFixed(2),
    );

    recipes[0].pricePerServing = `${recipes[0].pricePerServing} ${price[0].name}`;
    if (!recipes[0].paymentInfo) return recipes;
    recipes[0].paymentInfo.price *= pricePerDollar;
    recipes[0].paymentInfo.price = parseFloat(
      recipes[0].paymentInfo.price.toFixed(2),
    );
    recipes[0].paymentInfo.price = `${recipes[0].paymentInfo.price} ${price[0].name}`;

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
