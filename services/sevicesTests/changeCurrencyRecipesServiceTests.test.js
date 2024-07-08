const CurrencyModel = require("../../models/curencyModel");
const RecipeModel = require("../../models/recipeModel");
jest.mock("../../models/recipeModel");
jest.mock("../../models/curencyModel");
const {
  changeCurrency,
  changeCurrencyForPayment,
  changeCurrencyPrice,
} = require("../changeCurrencyRecipesService");

test("changeCurrency should change the currency of the recipes", async () => {
  const recipes = [
    {
      pricePerServing: 2.5,
      paymentInfo: { price: 25 },
    },
    {
      pricePerServing: 3.5,
      paymentInfo: { price: 35 },
    },
  ];
  const currency = "NZD";
  const price = [{ pricePerDollar: 0.5, name: "NZD" }];

  CurrencyModel.find.mockResolvedValue(price);

  const expectedRecipes = [
    {
      pricePerServing: "1.25 NZD",
      paymentInfo: { price: "12.5 NZD" },
    },
    {
      pricePerServing: "1.75 NZD",
      paymentInfo: { price: "17.5 NZD" },
    },
  ];

  const result = await changeCurrency(recipes, currency);
  expect(result).toEqual(expectedRecipes);
});
test("changeCurrency should return the recipes without changing the currency if currency equal USD", async () => {
  const recipes = [
    {
      pricePerServing: 2.5,
      paymentInfo: { price: 25 },
    },
    {
      pricePerServing: 3.5,
      paymentInfo: { price: 35 },
    },
  ];
  const currency = "USD";
  const price = [];

  CurrencyModel.find.mockResolvedValue(price);

  const expectedRecipes = [
    {
      pricePerServing: 2.5,
      paymentInfo: { price: 25 },
    },
    {
      pricePerServing: 3.5,
      paymentInfo: { price: 35 },
    },
  ];

  const result = await changeCurrency(recipes, currency);
  expect(result).toEqual(expectedRecipes);
});

test("changeCurrencyForPayment should change the currency of the recipe", async () => {
  const recipeId = "1";
  const currency = "NZD";
  const price = [{ pricePerDollar: 0.5, name: "NZD" }];
  const recipe = {
    paymentInfo: { price: 25 },
  };

  CurrencyModel.find.mockResolvedValue(price);
  RecipeModel.findById.mockResolvedValue(recipe);
  const expectedPrice = 1250;
  const result = await changeCurrencyForPayment(recipeId, currency);
  expect(result).toEqual(expectedPrice);
});

test("changeCurrencyPrice should change the currency of the price", async () => {
  const price = 25;
  const currency = "NZD";
  const pricePerDollar = 0.5;
  const priceBd = [{ pricePerDollar, name: currency }];

  CurrencyModel.find.mockResolvedValue(priceBd);
  const expectedPrice = 12.5;
  const result = await changeCurrencyPrice(price, currency);
  expect(result).toEqual(expectedPrice);
});
