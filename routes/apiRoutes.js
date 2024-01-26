const express = require("express");
const { getRecipes,
	getRandomRecipes,
	getInformationById,
	getRecommendedRecipes,
	getFavouriteRecipes,
	getRecipesByIngridients,
   translateRecipe,
	getRecipesBySort,} = require("../controllers/apiController");

const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();


router.get("/", getRecipes);

router.post("/translate", translateRecipe);

router.get("/random", getRandomRecipes);

router.get("/recommended/:id", getRecommendedRecipes);

router.get("/ingredients", getRecipesByIngridients);

router.get("/favourite",authMiddleware, getFavouriteRecipes);

router.get("/top-categories",getRecipesBySort);

router.get("/:id", getInformationById);



module.exports = router;