const { faker } = require("@faker-js/faker");
const Recipe = require("../models/recipeModel");
const mongoose = require("mongoose");
const { createApi } = require("unsplash-js");

const serverApi = createApi({
  accessKey: process.env.UNSPLASH_ACCESS_KEY,
});
const ingredients = [
  "4 large avocados, ripe",
  "1/2 cup agave nectar*",
  "2/3 cup unsweetened cocoa powder",
  "6 tbsp chocolate almond milk",
  "2 tsp vanilla",
  "2 pinches sea salt",
  "1 tsp fine espresso grounds",
  "1 tsp Chai Spice Blend",
  "2 tsp cinnamon",
  "2 tsp cardamom",
  "1 tsp ginger",
  "1/2 tsp nutmeg",
  "1 cup granulated sugar",
  "1 cup brown sugar, packed",
  "1/2 cup honey",
  "1/4 cup maple syrup",
  "1/3 cup molasses",
  "2 cups all-purpose flour",
  "1 cup whole wheat flour",
  "1/2 cup almond flour",
  "1/3 cup coconut flour",
  "1/4 cup cornstarch",
  "2 tbsp baking powder",
  "1 tbsp baking soda",
  "1/2 tsp cream of tartar",
  "3 large eggs",
  "2 large egg yolks",
  "1 cup buttermilk",
  "1/2 cup sour cream",
  "1 cup heavy cream",
  "2 cups whole milk",
  "1 cup skim milk",
  "1/2 cup evaporated milk",
  "1/3 cup sweetened condensed milk",
  "2 tbsp lemon juice",
  "1 tbsp lime juice",
  "1 tsp orange zest",
  "1 tsp lemon zest",
  "1 tsp lime zest",
  "1/2 cup orange juice",
  "1/3 cup pineapple juice",
  "1/4 cup apple cider vinegar",
  "2 tbsp red wine vinegar",
  "1 tbsp white vinegar",
  "1/2 cup olive oil",
  "1/3 cup vegetable oil",
  "1/4 cup canola oil",
  "2 tbsp sesame oil",
  "1 tbsp coconut oil",
  "1/2 cup peanut butter",
  "1/3 cup almond butter",
  "1/4 cup tahini",
  "2 tbsp soy sauce",
  "1 tbsp Worcestershire sauce",
  "1 tsp fish sauce",
  "2 tbsp hoisin sauce",
  "1 tbsp oyster sauce",
  "1/2 cup ketchup",
  "1/3 cup mustard",
  "1/4 cup mayonnaise",
  "2 tbsp hot sauce",
  "1 tbsp sriracha",
  "1 tsp paprika",
  "1 tsp smoked paprika",
  "1 tsp turmeric",
  "1 tsp cumin",
  "1 tsp coriander",
  "1 tsp fennel seeds",
  "1 tsp mustard seeds",
  "1/2 tsp fenugreek",
  "1/2 tsp saffron",
  "1/2 tsp anise seeds",
  "2 bay leaves",
  "1/2 cup parsley, chopped",
  "1/4 cup cilantro, chopped",
  "2 tbsp dill, chopped",
  "1 tbsp rosemary, chopped",
  "1 tbsp thyme, chopped",
  "1 tbsp oregano, chopped",
  "1 tsp basil, chopped",
  "1 tsp marjoram, chopped",
  "1/2 cup spinach, chopped",
  "1/3 cup kale, chopped",
  "1/4 cup arugula, chopped",
  "2 tbsp mint, chopped",
  "1 tbsp chives, chopped",
  "1 tbsp tarragon, chopped",
  "1/2 cup broccoli florets",
  "1/3 cup cauliflower florets",
  "1/4 cup brussels sprouts, halved",
  "2 cups mixed greens",
  "1 cup romaine lettuce, chopped",
  "1 cup iceberg lettuce, chopped",
  "1/2 cup cherry tomatoes, halved",
  "1/3 cup grape tomatoes, halved",
  "1/4 cup sun-dried tomatoes, chopped",
  "2 tbsp tomato paste",
  "1/2 cup tomato sauce",
  "1/3 cup marinara sauce",
  "1/4 cup salsa",
  "2 tbsp pico de gallo",
  "1 tbsp guacamole",
  "1/2 cup mashed potatoes",
  "1/3 cup sweet potato, mashed",
  "1/4 cup butternut squash, mashed",
  "2 cups zucchini, sliced",
  "1 cup yellow squash, sliced",
  "1 cup cucumber, sliced",
  "1/2 cup carrots, shredded",
  "1/3 cup celery, diced",
  "1/4 cup bell pepper, chopped",
  "2 tbsp jalapeno, diced",
  "1 tbsp habanero, diced",
  "1 cup corn kernels",
  "1/2 cup peas",
  "1/3 cup green beans, chopped",
  "1/4 cup edamame",
  "2 tbsp lentils",
  "1 tbsp chickpeas",
  "1/2 cup kidney beans",
  "1/3 cup black beans",
  "1/4 cup pinto beans",
  "2 tbsp navy beans",
  "1 tbsp cannellini beans",
  "1/2 cup quinoa",
  "1/3 cup couscous",
  "1/4 cup bulgur",
  "2 cups white rice",
  "1 cup brown rice",
  "1/2 cup wild rice",
  "1/3 cup basmati rice",
  "1/4 cup jasmine rice",
  "2 tbsp farro",
  "1 tbsp barley",
  "1/2 cup oatmeal",
  "1/3 cup steel-cut oats",
  "1/4 cup rolled oats",
  "2 tbsp chia seeds",
  "1 tbsp flax seeds",
  "1/2 cup sunflower seeds",
  "1/3 cup pumpkin seeds",
  "1/4 cup sesame seeds",
  "2 tbsp poppy seeds",
  "1 tbsp hemp seeds",
  "1/2 cup almonds, sliced",
  "1/3 cup walnuts, chopped",
  "1/4 cup pecans, chopped",
  "2 tbsp hazelnuts, chopped",
  "1 tbsp macadamia nuts, chopped",
  "1/2 cup cashews, chopped",
  "1/3 cup pistachios, chopped",
  "1/4 cup pine nuts",
  "2 tbsp brazil nuts, chopped",
  "1 tbsp coconut flakes",
  "1/2 cup dried cranberries",
  "1/3 cup raisins",
  "1/4 cup currants",
  "2 tbsp dried apricots, chopped",
  "1 tbsp dried figs, chopped",
  "1/2 cup dates, chopped",
  "1/3 cup prunes, chopped",
  "1/4 cup dried mango, chopped",
  "2 tbsp dried pineapple, chopped",
  "1 tbsp dried papaya, chopped",
  "1/2 cup dark chocolate chips",
  "1/3 cup white chocolate chips",
  "1/4 cup milk chocolate chips",
  "2 tbsp cocoa nibs",
  "1 tbsp cacao powder",
  "1/2 cup graham cracker crumbs",
  "1/3 cup crushed pretzels",
  "1/4 cup crushed cookies",
  "2 tbsp sprinkles",
  "1 tbsp chocolate sprinkles",
  "1/2 cup marshmallows",
  "1/3 cup mini marshmallows",
  "1/4 cup caramel sauce",
  "2 tbsp hot fudge",
  "1 tbsp butterscotch sauce",
  "1/2 cup whipped cream",
  "1/3 cup vanilla ice cream",
  "1/4 cup chocolate ice cream",
  "2 tbsp strawberry ice cream",
  "1 tbsp cookie dough ice cream",
  "1/2 cup raspberry sorbet",
  "1/3 cup lemon sorbet",
  "1/4 cup mango sorbet",
  "2 tbsp frozen yogurt",
  "1 tbsp vanilla yogurt",
  "1/2 cup Greek yogurt",
  "1/3 cup plain yogurt",
  "1/4 cup strawberry yogurt",
  "2 tbsp blueberry yogurt",
  "1 tbsp raspberry yogurt",
  "1/2 cup cream cheese",
  "1/3 cup mascarpone cheese",
  "1/4 cup ricotta cheese",
  "2 tbsp feta cheese",
  "1 tbsp goat cheese",
  "1/2 cup cheddar cheese, shredded",
  "1/3 cup mozzarella cheese, shredded",
  "1/4 cup Parmesan cheese, grated",
  "2 tbsp blue cheese, crumbled",
  "1 tbsp gorgonzola cheese, crumbled",
  "1/2 cup Swiss cheese, shredded",
  "1/3 cup provolone cheese, sliced",
  "1/4 cup pepper jack cheese, shredded",
  "2 tbsp Colby jack cheese, shredded",
  "1 tbsp Havarti cheese, sliced",
  "1/2 cup brie cheese, sliced",
  "1/3 cup Camembert cheese, sliced",
  "1/4 cup manchego cheese, sliced",
  "2 tbsp gouda cheese, sliced",
  "1 tbsp Edam cheese, sliced",
  "1/2 cup fontina cheese, shredded",
  "1/3 cup Asiago cheese, grated",
  "1/4 cup Pecorino Romano cheese, grated",
];
function generateInstructions(extendedIngredients) {
  const steps = [];
  const cookingActions = [
    "Chop",
    "Mix",
    "Stir",
    "Heat",
    "Bake",
    "Blend",
    "Boil",
    "Cook",
    "Fry",
    "Grill",
    "Roast",
    "Saute",
    "Season",
    "Serve",
    "Simmer",
    "Slice",
    "Whisk",
  ];

  const numSteps = faker.number.int({ min: 3, max: 7 });

  for (let i = 0; i < numSteps; i++) {
    const action = faker.helpers.arrayElement(cookingActions);
    const ingredient = faker.helpers.arrayElement(extendedIngredients).original;

    steps.push(`<li>${action} ${ingredient} until well combined.</li>`);
  }

  return `<ol>${steps.join("")}</ol>`;
}

const fetchRealImages = async () => {
  try {
    const perPage = 30;
    const numRecipes = 1000;
    const totalPages = Math.ceil(numRecipes / perPage);
    let results = [];

    for (let page = 1; page <= totalPages; page++) {
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
    const existingImages = new Set();

    for (let i = 0; i < 1000; i++) {
      if (existingImages.has(foodImages[i].title)) {
        continue;
      }

      existingImages.add(foodImages[i].title);

      const extendedIngredients = [];
      const diets = [];
      const cuisines = [];
      const dishTypes = [];

      const numExtendedIngredients = faker.number.int({ min: 1, max: 10 });

      for (let j = 0; j < numExtendedIngredients; j++) {
        extendedIngredients.push({
          original: faker.helpers.arrayElement(ingredients),
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

      const paymentStatus = faker.datatype.boolean();
      const paymentInfo = {
        paymentStatus: paymentStatus,
      };
      if (!paymentStatus) {
        paymentInfo.paymentDate = faker.date.past();
        paymentInfo.price = faker.commerce.price({ min: 10, max: 20, dec: 2 });
        paymentInfo.paymentMethod = faker.finance.creditCardIssuer();
      }
      const existedUsersIds = await mongoose.model("User").find({}, "_id");
      const recipe = {
        extendedIngredients: extendedIngredients,
        user: faker.helpers.arrayElement(existedUsersIds),
        paymentInfo: paymentInfo,
        diets: diets,
        cuisines: cuisines,
        dishTypes: dishTypes,
        title: foodImages[i].title || faker.commerce.productName(),
        aggregateLikes: foodImages[i].likes,
        readyInMinutes: faker.number.int({ min: 1, max: 120 }),
        image: foodImages[i].image,
        instructions: generateInstructions(extendedIngredients),
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
