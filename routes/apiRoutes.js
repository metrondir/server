const express = require("express");
const {
  getRecipes,
  getRandomRecipes,
  getInformationById,
  getRecommendedRecipes,
  getRecipesByIngridients,
  translateRecipe,
  getRecipesByCategories,
} = require("../controllers/apiController");

const router = express.Router();

router.get("/", getRecipes);

router.post("/translate", translateRecipe);

router.get("/random", getRandomRecipes);

router.get("/recommended/:id", getRecommendedRecipes);

router.get("/ingredients", getRecipesByIngridients);

router.get("/top-categories", getRecipesByCategories);

router.get("/:id", getInformationById);

module.exports = router;
