const asyncHandler = require("express-async-handler");
const Recipe = require("../models/recipeModel");
const { redisGetModels,redisGetModelsWithPaginating, onDataChanged } = require("../middleware/paginateMiddleware");
const ApiError = require("../middleware/apiError");
const { validationResult } = require('express-validator');
const FavoriteRecipe = require("../models/favoriteRecipeModel");

const multer = require('multer');

const imgur = require('imgur');





const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads'); 
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


//@desc Get all recipes
//@route GET /api/recipe/
//@access private

const getRecipes = asyncHandler(async (req, res, next) => {
  try {

    if(req.query.page && req.query.limit){
      const recipes = await redisGetModelsWithPaginating(Recipe, req, res, next, { user: req.user.id });
      return res.status(200).json(recipes);
    }
      else{
        const recipes = await redisGetModels(Recipe, req, res, next, { user: req.user.id });
        return res.status(200).json(recipes);
      }
  
   
  } catch (error) {
    next(error);
  }
})
 

//@desc Create new Favorite recipe
//@route GET /api/recipe/favourite/:id
//@access private

const setFavoriteRecipes = async (req, res, next) => {
  try {
    const recipeId = req.params.id; 
    const existingFavoriteRecipe = await FavoriteRecipe.findOne({ recipe: recipeId, user: req.user.id });
    if (existingFavoriteRecipe) {
      const favoriteRecipe = await FavoriteRecipe.findByIdAndDelete(existingFavoriteRecipe._id);
      return res.status(200).json(favoriteRecipe);
    }

    const favoriteRecipe = new FavoriteRecipe({ recipe: recipeId, user: req.user.id });

    await favoriteRecipe.save();
    onDataChanged('Favoriterecipe');
    res.status(201).json(favoriteRecipe);
  } catch (error) {
    next(error);
  }
};

//@desc Get  Favorite recipe
//@route GET /api/recipe/favourite
//@access private

const getFavoriteRecipes = async (req, res, next) => {
  try {

    if(req.query.page && req.query.limit){
      const favoriteRecipes = await redisGetModelsWithPaginating(FavoriteRecipe, req, res, next, { user: req.user.id });
      return res.status(200).json(favoriteRecipes);
    }
      else{
        const favoriteRecipes = await redisGetModels(FavoriteRecipe, req, res, next, { user: req.user.id });
        return res.status(200).json(favoriteRecipes);
      }
  
   
  } catch (error) {
    next(error);
  }
};


//@desc Create new recipe
//@route POST /api/recipe
//@access private

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
        user: req.user.id,
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
//@access private

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
//@access private

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
//@access private
const deleteRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
        res.status(404);
        throw ApiError.BadRequest("Recipe not found");
    }
    await Recipe.deleteOne({ _id: req.params.id });
    onDataChanged('Recipe');
    res.status(200).json(recipe);
  
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



