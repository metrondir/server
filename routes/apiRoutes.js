const express = require("express");
const {
  getUnifiedRecipes,
  getRandomRecipes,
  getInformationById,
  getRecommendedRecipes,
  getRecipesByIngridients,
  translateRecipe,
} = require("../controllers/apiController");

const isLoggedMiddlware = require("../middleware/isLoggedMiddlware");

const router = express.Router();

router.get("/", isLoggedMiddlware, getUnifiedRecipes);

router.post("/translate", isLoggedMiddlware, translateRecipe);

router.get("/random", isLoggedMiddlware, getRandomRecipes);

router.get("/recommended/:id", isLoggedMiddlware, getRecommendedRecipes);

router.get("/ingredients", isLoggedMiddlware, getRecipesByIngridients);

router.get("/:id", isLoggedMiddlware, getInformationById);

module.exports = router;
