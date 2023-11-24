const express = require("express");
const router = express.Router();
const {getRecipes,createRecipe,getRecipe,updateRecipe ,deleteRecipe,} = require("../controllers/recipeController");
const authMiddleware = require("../middleware/authMiddleware");



router.route("/").get(getRecipes,authMiddleware).post(createRecipe,authMiddleware);

router.route("/:id").get(getRecipe,authMiddleware).put(updateRecipe,authMiddleware).delete(deleteRecipe,authMiddleware);

module.exports = router;