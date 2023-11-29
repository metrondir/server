const express = require("express");
const router = express.Router();
const {getRecipes,createRecipe,getRecipe,updateRecipe ,deleteRecipe,} = require("../controllers/recipeController");
const authMiddleware = require("../middleware/authMiddleware");



router.route("/").get(authMiddleware, getRecipes).post(authMiddleware, createRecipe);

router.route("/:id").get(authMiddleware, getRecipe).put(authMiddleware, updateRecipe).delete(authMiddleware, deleteRecipe);
module.exports = router;