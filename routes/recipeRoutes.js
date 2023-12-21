const express = require("express");
const router = express.Router();
const {getRecipes,createRecipe,getRecipe,updateRecipe ,deleteRecipe,} = require("../controllers/recipeController");
const authMiddleware = require("../middleware/authMiddleware");
const convertFieldsToBooleans = require("../middleware/convertFields");



router.route("/").get(authMiddleware, getRecipes).post(authMiddleware,convertFieldsToBooleans(['vegetarian', 'cheap']), createRecipe);

router.route("/:id").get(authMiddleware, getRecipe).put(authMiddleware,convertFieldsToBooleans(['vegetarian', 'cheap']), updateRecipe).delete(authMiddleware, deleteRecipe);
module.exports = router;