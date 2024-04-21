const express = require("express");
const router = express.Router();
const {
  getRecipes,
  setFavoriteRecipes,
  createRecipe,
  createRecipeByDraft,
  updateRecipe,
  deleteRecipe,
  loadDataToSelect,
  loadCurrencyAndLanguges,
  loadIngredients,
  createCheckoutSession,
  getAllPaymentRecipes,
  getRecipesCollection,
  getSesionsStatus,
} = require("../controllers/recipeController");
const { getFavouriteRecipes } = require("../controllers/apiController");
const authMiddleware = require("../middleware/authMiddleware");

router
  .route("/")
  .get(authMiddleware, getRecipes)
  .post(authMiddleware, createRecipe);

router.get("/data", loadDataToSelect);

router.get("/load-currency-languages", loadCurrencyAndLanguges);
router.get("/load-ingredients", loadIngredients);

router.get("/favourite", authMiddleware, getFavouriteRecipes);
router.get(
  "/:id/create-checkout-session",

  createCheckoutSession,
);

router.route("/collection").get(authMiddleware, getRecipesCollection);

router.get("/payment-recipes", authMiddleware, getAllPaymentRecipes);
router.post("/webhooks", getSesionsStatus);
router.route("/favourite/:id").get(authMiddleware, setFavoriteRecipes);

router.route("/by-draft").post(authMiddleware, createRecipeByDraft);

router
  .route("/:id")
  .put(authMiddleware, updateRecipe)
  .delete(authMiddleware, deleteRecipe);

module.exports = router;
