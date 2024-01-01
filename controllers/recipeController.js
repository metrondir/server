const asyncHandler = require("express-async-handler");
const Recipe = require("../models/recipeModel");
const { redisGetModels,redisGetModelsWithPaginating, onDataChanged } = require("../middleware/paginateMiddleware");
const ApiError = require("../middleware/apiError");
const { check, validationResult } = require('express-validator');
const FavoriteRecipe = require("../models/favoriteRecipeModel");
const RefreshToken = require("../models/tokenModel");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const imgur = require('imgur');
const { on } = require("events");


//@desc Get all contacts
//@route GET /api/recipe
//@access public

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads'); // This is the folder where the files will be saved. Make sure this folder exists.
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
function parseNestedArray(arr) {
  if (!Array.isArray(arr)) {
    throw new Error('Expected an array');
  }

  return arr.map(item => {
    if (Array.isArray(item)) {
      return parseNestedArray(item);
    } else {
      return JSON.parse(item).original;
    }
  });
}

const getRecipes = asyncHandler(async (req, res,next) => {
    try{
        if(req.query.page && req.query.limit){

            const recipes = await redisGetModelsWithPaginating(Recipe, req, res, next);

            res.status(200).json(recipes);
        }
        else{
            const recipes = await redisGetModels(Recipe, req, res, next);
            res.status(200).json(recipes);
        }
      
     
    }
    catch(error){
        next(error);
    }

});

const setFavoriteRecipes = async (req, res, next) => {
  try {
    const refreshToken = await RefreshToken.findOne({ refreshToken: req.cookies.refreshToken });

    if (!refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }console.log(refreshToken.user);

    const recipeId = req.params.id; // Get the recipe ID from the path
    const existingFavoriteRecipe = await FavoriteRecipe.findOne({ recipe: recipeId, user: refreshToken.user });
    if (existingFavoriteRecipe) {
      const favoriteRecipe = await FavoriteRecipe.findByIdAndDelete(existingFavoriteRecipe._id);
      return res.status(200).json(favoriteRecipe);
    }

    const favoriteRecipe = new FavoriteRecipe({ recipe: recipeId, user: refreshToken.user });

    await favoriteRecipe.save();
    onDataChanged('Favoriterecipe');
    res.status(201).json(favoriteRecipe);
  } catch (error) {
    next(error);
  }
};

const getFavoriteRecipes = async (req, res, next) => {
  try {
    const refreshToken = await RefreshToken.findOne({ refreshToken: req.cookies.refreshToken });

    if (!refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const favoriteRecipes = await FavoriteRecipe.find({ user: refreshToken.user });
    if (!favoriteRecipes.length) {
      return res.status(404).json({ message: 'This user dont have favorites recipes' });
    }
    if(req.query.page && req.query.limit){
      const paginatedResult = await redisGetModelsWithPaginating(FavoriteRecipe, req, res, next, { user: refreshToken.user });
      return res.status(200).json(paginatedResult);
    }
      else{
        const favoriteRecipes = await redisGetModels(FavoriteRecipe, req, res, next, { user: refreshToken.user });
        return res.status(200).json(favoriteRecipes);
      }
  
   
  } catch (error) {
    next(error);
  }
};


//@desc Create new recipe
//@route POST /api/recipe
//@access public

const createRecipe = [

  
  upload.single('image'),

  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.body.extendedIngredients && typeof req.body.extendedIngredients === 'string') {
      let parsedIngredients = JSON.parse(req.body.extendedIngredients);
      req.body.extendedIngredients = parsedIngredients;
    }
    
    const refreshToken = await RefreshToken.findOne({ refreshToken: req.cookies.refreshToken });

    if (!refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const imgurLink = await imgur.uploadFile(req.file.path);
    try {
      const recipe = new Recipe({
        title: req.body.title,
        cuisine: req.body.cuisine,
        dishType: req.body.dishType,
        readyInMinutes: req.body.readyInMinutes,
        vegetarian: req.body.vegetarian,
        cheap: req.body.cheap,
        instructions: req.body.instructions,
        extendedIngredients: req.body.extendedIngredients,
        image : imgurLink.link,
        userId: refreshToken.user,
      });

      await recipe.save();
     
      onDataChanged('Recipe');
      res.status(201).json(recipe);
   
    } catch (error) {
    
      res.status(500).json({ error: error.message });
    }
  }),
];
//@desc Get recipe
//@route GET /api/recipe:/id
//@access public
const getRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if(!recipe){
        res.status(404);
        throw ApiError.BadRequest("Recipe not found");
    }
    res.status(200).json(recipe);

  });

//@desc Update recipe
//@route PUT /api/recipe:/id
//@access public
const updateRecipe = asyncHandler(async(req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if(!recipe){
        return res.status(404).json({ error: "Recipe not found" });
    }

    if (req.body.extendedIngredients && typeof req.body.extendedIngredients === 'string') {
      let parsedIngredients = JSON.parse(req.body.extendedIngredients);
      req.body.extendedIngredients = parsedIngredients;
    }

    const updatedRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        req.body,
        {new : true}
    );
    onDataChanged('Recipe');
    res.status(200).json(updatedRecipe);
 

});

//@desc Delete recipe
//@route DELETE /api/recipe:/id
//@access public
const deleteRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
        res.status(404);
        throw ApiError.BadRequest("Recipe not found");
    }
    await Recipe.deleteOne({ _id: req.params.id });
    res.status(200).json(recipe);
    onDataChanged('Recipe');
});

module.exports = {
    getRecipes,
    createRecipe,
    getRecipe,
    updateRecipe ,
    deleteRecipe,
    getFavoriteRecipes,
    setFavoriteRecipes,
};



