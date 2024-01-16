const express = require("express");
const { getRecipes,
	getRandomRecipes,
	getInformationById,
	getRecommendedRecipes,
	getFavouriteRecipes,} = require("../controllers/apiController");

const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
router.get("/favourite",authMiddleware, getFavouriteRecipes);
router.get("/", getRecipes);
router.get("/random", getRandomRecipes);
router.get("/recommended/:id", getRecommendedRecipes);
router.get("/:id", getInformationById);


module.exports = router;