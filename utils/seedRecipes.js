const { faker } = require("@faker-js/faker");
const Recipe = require("../models/recipeModel");
const mongoose = require("mongoose");
const { createApi } = require("unsplash-js");

const serverApi = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY,
});

const fetchRealImages = async () => {
  try {
    const perPage = 30;
    const numRecipes = 2300;
    const totalPages = Math.ceil(numRecipes / perPage);
    let results = [];

    for (let page = 40; page <= totalPages; page++) {
      const response = await serverApi.search.getPhotos({
        query: "recipe",
        perPage: perPage,
        page: page,
      });
      results = results.concat(
        response.response.results.map((result) => ({
          image: result.urls.regular,
          likes: result.likes,
          title:
            result.alt_description ||
            result.description ||
            faker.commerce.productName(),
        })),
      );

      results.forEach((item, index) => {
        results[index].title = item.title.replace(/\b\w/g, (char) =>
          char.toUpperCase(),
        );
      });

      if (results.length >= numRecipes) break;
    }
    return results.slice(0, numRecipes);
  } catch (error) {
    console.error("Error fetching images and titles from Unsplash:", error);
    return [];
  }
};

async function seedRecipes() {
  try {
    const recipes = [];
    const foodImages = await fetchRealImages();
    for (let i = 0; i < 1000; i++) {
      const extendedIngredients = [];
      const diets = [];
      const cuisines = [];
      const dishTypes = [];

      const numExtendedIngredients = faker.number.int({ min: 1, max: 10 });
      for (let j = 0; j < numExtendedIngredients; j++) {
        extendedIngredients.push({
          original: faker.commerce.productName(),
          meta: [],
        });
      }

      const numDiets = faker.number.int({ min: 1, max: 3 });
      const dietOptions = [
        "gluten free",
        "non-ketogenic",
        "vegetarian",
        "lacto-vegetarian",
        "ovo-vegetarian",
        "vegan",
        "pescetarian",
        "paleo",
        "primal",
        "low fodmap",
        "whole30",
      ];
      for (let j = 0; j < numDiets; j++) {
        diets.push(faker.helpers.arrayElement(dietOptions));
      }

      const numCuisines = faker.number.int({ min: 1, max: 3 });
      const cuisineOptions = [
        "african",
        "asian",
        "american",
        "british",
        "cajun",
        "caribbean",
        "chinese",
        "eastern european",
        "european",
        "french",
        "german",
        "greek",
        "indian",
        "irish",
        "italian",
        "japanese",
        "jewish",
        "korean",
        "latin american",
        "mediterranean",
        "mexican",
        "middle eastern",
        "nordic",
        "southern",
        "spanish",
        "thai",
        "vietnamese",
      ];
      for (let j = 0; j < numCuisines; j++) {
        cuisines.push(faker.helpers.arrayElement(cuisineOptions));
      }

      const numDishTypes = faker.number.int({ min: 1, max: 3 });
      const dishTypeOptions = [
        "main course",
        "side dish",
        "dessert",
        "appetizer",
        "salad",
        "bread",
        "breakfast",
        "soup",
        "beverage",
        "sauce",
        "marinade",
        "finger food",
        "snack",
        "drink",
      ];
      for (let j = 0; j < numDishTypes; j++) {
        dishTypes.push(faker.helpers.arrayElement(dishTypeOptions));
      }

      const recipe = {
        extendedIngredients: extendedIngredients,
        user: new mongoose.Types.ObjectId(),
        paymentInfo: {
          paymentStatus: faker.datatype.boolean(),
          pricePerServing: faker.number.int({ min: 1, max: 20 }),
          paymentMethod: faker.finance.creditCardIssuer(),
        },
        diets: diets,
        cuisines: cuisines,
        dishTypes: dishTypes,
        title: foodImages[i].title || faker.commerce.productName(),
        aggregateLikes: foodImages[i].likes,
        readyInMinutes: faker.number.int({ min: 1, max: 120 }),
        image: foodImages[i].image,
        instructions: `<ol><li>${faker.lorem.paragraph()}</li><li>${faker.lorem.paragraph()}</li><li>${faker.lorem.paragraph()}</li><li>${faker.lorem.paragraph()}</li><li>${faker.lorem.paragraph()}</li></ol>`,
        pricePerServing: faker.commerce.price({ min: 100, max: 2000, dec: 2 }),
        analyzedInstructions: [],
      };

      recipes.push(recipe);
    }

    await Recipe.insertMany(recipes);
    console.log("Recipes seeded successfully");
  } catch (err) {
    console.log(err);
  }
}

module.exports = seedRecipes;
