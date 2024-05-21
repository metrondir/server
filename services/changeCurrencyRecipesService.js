const asynchHandler = require("express-async-handler");
const CurencyModel = require("../models/curencyModel");
const RecipeModel = require("../models/recipeModel");

const changeCurrency = asynchHandler(async (recipes, currency) => {
  const price = await CurencyModel.find({ lan: currency });
  if (price && price.length > 0 && recipes.length > 1) {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.forEach((recipe) => {
      if (typeof recipe.pricePerServing === "string") {
        recipe.pricePerServing = parseFloat(recipe.pricePerServing);
      }

      recipe.pricePerServing *= pricePerDollar;

      recipe.pricePerServing = parseFloat(recipe.pricePerServing).toFixed(2);
      //if (typeof recipe.pricePerServing === "number") {
      //  const pricing = {
      //    amount: recipe.pricePerServing,
      //    currency: price[0].name,
      //  };
      //  console.log(pricing);
      //  recipe.pricePerServing += pricing.currency;
      //  console.log(recipe.pricePerServing);
      //}

      recipe.pricePerServing = `${recipe.pricePerServing} ${price[0].name}`;

      if (recipe.paymentInfo == undefined || !recipe.paymentInfo.price)
        return recipes;
      recipe.paymentInfo.price *= pricePerDollar;
      recipe.paymentInfo.price = parseFloat(
        recipe.paymentInfo.price.toFixed(2),
      );
      recipe.paymentInfo.price = `${recipe.paymentInfo.price} ${price[0].name}`;
    });

    return recipes;
  } else {
    const pricePerDollar = price[0].pricePerDollar;
    recipes.pricePerServing *= pricePerDollar;

    recipes.pricePerServing = parseFloat(recipes.pricePerServing.toFixed(2));

    recipes.pricePerServing = `${recipes.pricePerServing} ${price[0].name}`;
    if (recipes.paymentInfo == undefined || !recipes.paymentInfo.price)
      return recipes;
    recipes.paymentInfo.price *= pricePerDollar;
    recipes.paymentInfo.price = parseFloat(
      recipes.paymentInfo.price.toFixed(2),
    );
    recipes.paymentInfo.price = `${recipes.paymentInfo.price} ${price[0].name}`;
    return recipes;
  }
});

const changeCurrencyForPayment = asynchHandler(async (id, currency) => {
  const price = await CurencyModel.find({ name: currency });
  const recipe = await RecipeModel.findById(id);
  const pricePerDollar = price[0].pricePerDollar;

  recipe.paymentInfo.price = parseFloat(
    (recipe.paymentInfo.price * pricePerDollar).toFixed(2) * 100,
  );
  return parseFloat(recipe.paymentInfo.price.toFixed(2));
});
module.exports = { changeCurrency, changeCurrencyForPayment };
