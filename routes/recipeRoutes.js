const express = require("express");
const router = express.Router();
const {getRecipes,createRecipe,getRecipe,updateRecipe ,deleteRecipe,setFavoriteRecipes,getFavoriteRecipes} = require("../controllers/recipeController");
const authMiddleware = require("../middleware/authMiddleware");
const convertFieldsToBooleans = require("../middleware/convertFields");



router.route("/").get(authMiddleware, getRecipes).post(authMiddleware,convertFieldsToBooleans(['vegetarian', 'cheap']), createRecipe);
router.route("/favorite").get(authMiddleware, getFavoriteRecipes);
router.route("/:id").get(authMiddleware, getRecipe)
.put(authMiddleware,convertFieldsToBooleans(['vegetarian', 'cheap']), updateRecipe)
.delete(authMiddleware, deleteRecipe).post(authMiddleware, setFavoriteRecipes);
module.exports = router;