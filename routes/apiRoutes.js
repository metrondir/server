const express = require("express");
const { getRecipes,
	getRandomRecipes,
	getInformationById,
	getRecomendedrecipes, } = require("../controllers/apiController");
const router = express.Router();

router.get("/", getRecipes);
router.get("/random", getRandomRecipes);
router.get("/recomended/:id", getRecomendedrecipes);
router.get("/:id", getInformationById);

module.exports = router;