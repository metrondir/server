const express = require("express");
const router = express.Router();
const {
  getRecipes,
  setFavoriteRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  loadDataToSelect,
} = require("../controllers/recipeController");
const { getFavouriteRecipes } = require("../controllers/apiController");
const authMiddleware = require("../middleware/authMiddleware");

router
  .route("/")
  .get(authMiddleware, getRecipes)
  .post(authMiddleware, createRecipe);

router.get("/data", loadDataToSelect);

router.get("/favourite", authMiddleware, getFavouriteRecipes);

router.route("/favourite/:id").get(authMiddleware, setFavoriteRecipes);

router
  .route("/:id")
  .put(authMiddleware, updateRecipe)
  .delete(authMiddleware, deleteRecipe);

module.exports = router;
