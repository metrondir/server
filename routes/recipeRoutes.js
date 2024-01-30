const express = require("express");
const router = express.Router();
const {getRecipe,getRecipes,setFavoriteRecipes,
		 createRecipe,updateRecipe,deleteRecipe,} = require("../controllers/recipeController");
const {getFavouriteRecipes}= require("../controllers/apiController")
const authMiddleware = require("../middleware/authMiddleware");


router.route("/").get(authMiddleware, getRecipes).post(authMiddleware,createRecipe);
router.get("/favourite",authMiddleware, getFavouriteRecipes);
router.route("/favourite/:id").get(authMiddleware, setFavoriteRecipes);
router.route("/:id").get(authMiddleware, getRecipe).put(authMiddleware, updateRecipe).delete(authMiddleware, deleteRecipe);


module.exports = router;