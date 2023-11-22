const express = require("express");
const router = express.Router();
const {getRecipes,
    createRecipe,
    getRecipe,
    updateRecipe ,
    deleteRecipe,
} = require("../controllers/recipeController");
const validateToken = require("../midlware/validateTokenHandler");

router.use(validateToken);
router.route("/").get(getRecipes).post(createRecipe).options(createRecipe);

router.route("/:id").get(getRecipe).put(updateRecipe).delete(deleteRecipe);

module.exports = router;