const express = require("express");
const router = express.Router();
const {getRecipe,getRecipes,getFavoriteRecipes,setFavoriteRecipes,
		 createRecipe,updateRecipe,deleteRecipe,} = require("../controllers/recipeController");
const authMiddleware = require("../middleware/authMiddleware");
const convertFieldsToBooleans = require("../middleware/convertFields");



router.route("/").get(authMiddleware, getRecipes).post(authMiddleware,convertFieldsToBooleans(['vegetarian', 'cheap']), createRecipe);
router.route("/favourite").get(authMiddleware, getFavoriteRecipes);
router.route("/favourite/:id").get(authMiddleware, setFavoriteRecipes);
router.route("/:id").get(authMiddleware, getRecipe)
.put(authMiddleware,convertFieldsToBooleans(['vegetarian', 'cheap']), updateRecipe)
.delete(authMiddleware, deleteRecipe);
module.exports = router;