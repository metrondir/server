const express = require("express");
const { getRecipes,
	getRandomRecipes,
	getInformationById,
	getRecommendedRecipes,
	getFavouriteRecipes,
	getRecipesByIngridients,} = require("../controllers/apiController");

const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();


router.get("/", getRecipes);



router.get("/random", getRandomRecipes);

router.get("/recommended/:id", getRecommendedRecipes);

router.get("/ingredients", getRecipesByIngridients);

router.get("/favourite",authMiddleware, getFavouriteRecipes);

router.get("/:id", getInformationById);



module.exports = router;